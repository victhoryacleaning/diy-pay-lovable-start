
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { EmailSection } from "./EmailSection";
import { PaymentMethodTabs } from "./PaymentMethodTabs";
import { CheckoutButton } from "./CheckoutButton";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price_cents: number;
  max_installments_allowed: number;
}

interface CheckoutFormProps {
  product: Product;
}

const checkoutSchema = z.object({
  fullName: z.string().min(2, "Nome completo é obrigatório"),
  phone: z.string().optional(),
  cpfCnpj: z.string().optional(),
  instagram: z.string().optional(),
  email: z.string().email("Email inválido"),
  confirmEmail: z.string().email("Email inválido"),
  paymentMethod: z.enum(["credit_card", "pix", "bank_slip"]),
  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvv: z.string().optional(),
  installments: z.number().min(1).default(1),
  saveData: z.boolean().default(false),
}).refine((data) => data.email === data.confirmEmail, {
  message: "Os emails devem ser iguais",
  path: ["confirmEmail"],
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const CheckoutForm = ({ product }: CheckoutFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix" | "bank_slip">("credit_card");

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: "credit_card",
      installments: 1,
      saveData: false,
    },
  });

  const validateRequiredFields = (data: CheckoutFormData) => {
    if (data.paymentMethod === "bank_slip") {
      if (!data.fullName || !data.cpfCnpj) {
        toast({
          title: "Campos obrigatórios",
          description: "Nome completo e CPF/CNPJ são obrigatórios para boleto bancário.",
          variant: "destructive",
        });
        return false;
      }
    }

    if (data.paymentMethod === "credit_card") {
      if (!data.cardNumber || !data.cardName || !data.cardExpiry || !data.cardCvv) {
        toast({
          title: "Campos obrigatórios",
          description: "Todos os dados do cartão são obrigatórios.",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const createIuguCustomer = async (data: CheckoutFormData) => {
    const response = await fetch('/api/functions/v1/get-or-create-iugu-customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        name: data.fullName,
        cpf_cnpj: data.cpfCnpj,
        phone: data.phone,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar cliente');
    }

    const result = await response.json();
    return result.iugu_customer_id;
  };

  const createPaymentToken = async (data: CheckoutFormData) => {
    if (data.paymentMethod !== "credit_card") return null;

    const [firstName, ...lastNameParts] = (data.cardName || '').split(' ');
    const lastName = lastNameParts.join(' ');
    const [month, year] = (data.cardExpiry || '').split('/');

    const response = await fetch('/api/functions/v1/create-iugu-payment-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_number: data.cardNumber?.replace(/\s/g, ''),
        verification_value: data.cardCvv,
        first_name: firstName,
        last_name: lastName,
        month: month,
        year: `20${year}`,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao tokenizar cartão');
    }

    const result = await response.json();
    return result.id;
  };

  const createTransaction = async (data: CheckoutFormData, iuguCustomerId: string, cardToken?: string) => {
    const response = await fetch('/api/functions/v1/create-iugu-transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: product.id,
        buyer_email: data.email,
        iugu_customer_id: iuguCustomerId,
        payment_method_selected: data.paymentMethod,
        card_token: cardToken,
        installments: data.installments,
        buyer_name: data.fullName,
        buyer_cpf_cnpj: data.cpfCnpj,
        notification_url_base: `${window.location.origin}/api/webhook/iugu`,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao processar pagamento');
    }

    return await response.json();
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (!validateRequiredFields(data)) return;

    setIsLoading(true);

    try {
      // Step 1: Create/get Iugu customer
      const iuguCustomerId = await createIuguCustomer(data);

      // Step 2: Create payment token (for credit card only)
      let cardToken = null;
      if (data.paymentMethod === "credit_card") {
        cardToken = await createPaymentToken(data);
      }

      // Step 3: Create transaction
      const result = await createTransaction(data, iuguCustomerId, cardToken);

      if (result.success) {
        // Handle different payment methods
        if (data.paymentMethod === "pix" && result.pix_qr_code_text) {
          // Show PIX payment details
          toast({
            title: "Pagamento PIX gerado!",
            description: "Escaneie o QR Code ou copie o código PIX.",
          });
          // Could redirect to a PIX payment page or show modal
        } else if (data.paymentMethod === "bank_slip" && result.secure_url) {
          // Redirect to bank slip
          window.open(result.secure_url, '_blank');
          toast({
            title: "Boleto gerado!",
            description: "Seu boleto foi aberto em uma nova aba.",
          });
        } else if (data.paymentMethod === "credit_card") {
          if (result.iugu_status === "paid") {
            toast({
              title: "Pagamento aprovado!",
              description: "Seu pagamento foi processado com sucesso.",
            });
            // Redirect to success page
          } else if (result.secure_url) {
            // Redirect for 3DS authentication
            window.location.href = result.secure_url;
          }
        }
      } else {
        throw new Error(result.message || 'Erro no processamento do pagamento');
      }

    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Erro no pagamento",
        description: "Ocorreu um erro ao processar seu pagamento. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finalizar Compra</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <PersonalInfoSection form={form} />
            <EmailSection form={form} />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">
                💸 Tem um cupom de desconto?
              </label>
              <p className="text-sm text-gray-500">
                Funcionalidade em breve!
              </p>
            </div>

            <PaymentMethodTabs
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              form={form}
              maxInstallments={product.max_installments_allowed}
              productPriceCents={product.price_cents}
            />

            <CheckoutButton isLoading={isLoading} />

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-500">
                🔒 Pagamento processado por DIYPay
              </p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
