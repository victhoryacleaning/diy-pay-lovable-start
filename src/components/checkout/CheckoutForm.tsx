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
import { DonationValueSection } from "./DonationValueSection";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price_cents: number;
  max_installments_allowed: number;
  product_type?: string;
}

interface CheckoutFormProps {
  product: Product;
  onDonationAmountChange?: (amount: string) => void;
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
  donationAmount: z.string().optional(),
}).refine((data) => data.email === data.confirmEmail, {
  message: "Os emails devem ser iguais",
  path: ["confirmEmail"],
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const CheckoutForm = ({ product, onDonationAmountChange }: CheckoutFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix" | "bank_slip">("credit_card");
  const isDonation = product.product_type === 'donation';

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: "credit_card",
      installments: 1,
      saveData: false,
      donationAmount: isDonation ? "" : undefined,
    },
  });
  
  // Watch for donation amount changes and notify parent component
  const donationAmount = form.watch('donationAmount');
  // Call onDonationAmountChange whenever donation amount changes
  if (isDonation && onDonationAmountChange && donationAmount !== undefined) {
    onDonationAmountChange(donationAmount);
  }

  const validateRequiredFields = (data: CheckoutFormData) => {
    // Validação específica para doações
    if (isDonation) {
      if (!data.donationAmount || data.donationAmount.trim() === "" || parseFloat(data.donationAmount.replace(',', '.')) <= 0) {
        toast({
          title: "Valor obrigatório",
          description: "Por favor, informe o valor da doação.",
          variant: "destructive",
        });
        return false;
      }
    }

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

  const convertDonationToCents = (donationValue: string): number => {
    console.log('[DEBUG] *** INICIANDO CONVERSÃO DO VALOR DA DOAÇÃO ***');
    console.log('[DEBUG] Valor original recebido:', donationValue);
    
    // 1. Remover formatação monetária (R$, espaços, pontos de milhares)
    let cleanValue = donationValue.replace(/[R$\s\.]/g, '');
    console.log('[DEBUG] Após remover formatação:', cleanValue);
    
    // 2. Substituir vírgula por ponto
    cleanValue = cleanValue.replace(',', '.');
    console.log('[DEBUG] Após substituir vírgula por ponto:', cleanValue);
    
    // 3. Converter para número
    const numberValue = parseFloat(cleanValue);
    console.log('[DEBUG] Valor convertido para número:', numberValue);
    
    // 4. Validar se é um número válido
    if (isNaN(numberValue) || numberValue <= 0) {
      console.error('[ERRO] Valor inválido para doação:', numberValue);
      return 0;
    }
    
    // 5. Converter para centavos (multiplicar por 100 e arredondar)
    const centavos = Math.round(numberValue * 100);
    console.log('[DEBUG] *** VALOR FINAL EM CENTAVOS ***:', centavos);
    
    return centavos;
  };

  const createIuguCustomer = async (data: CheckoutFormData) => {
    console.log('[DEBUG] Criando cliente Iugu...');
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
    console.log('[DEBUG] Resultado criar cliente:', result);
    return result;
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

  const createTransaction = async (data: CheckoutFormData, iuguCustomerId: string, buyerProfileId: string | null, cardToken?: string) => {
    console.log('[DEBUG] Criando transação com:', {
      iuguCustomerId,
      buyerProfileId,
      hasCardToken: !!cardToken,
      isDonation,
      donationAmount: data.donationAmount
    });

    const transactionPayload: any = {
      product_id: product.id,
      buyer_email: data.email,
      iugu_customer_id: iuguCustomerId,
      buyer_profile_id: buyerProfileId,
      payment_method_selected: data.paymentMethod,
      card_token: cardToken,
      installments: data.installments,
      buyer_name: data.fullName,
      buyer_cpf_cnpj: data.cpfCnpj,
      notification_url_base: `${window.location.origin}/api/webhook/iugu`,
    };

    if (isDonation && data.donationAmount) {
      const donationCents = convertDonationToCents(data.donationAmount);
      transactionPayload.donation_amount_cents = donationCents;
      console.log('[DEBUG] *** VALOR DA DOAÇÃO ADICIONADO AO PAYLOAD ***:', {
        original: data.donationAmount,
        cents: donationCents
      });
    }

    console.log('[DEBUG] *** PAYLOAD COMPLETO SENDO ENVIADO PARA create-iugu-transaction ***:', JSON.stringify(transactionPayload, null, 2));

    const response = await fetch('/api/functions/v1/create-iugu-transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionPayload),
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
      const customerResult = await createIuguCustomer(data);
      
      if (!customerResult.success) {
        throw new Error(customerResult.message || 'Erro ao criar cliente');
      }

      const iuguCustomerId = customerResult.iugu_customer_id;
      const buyerProfileId = customerResult.buyer_profile_id || null;

      console.log('[DEBUG] Cliente criado:', { iuguCustomerId, buyerProfileId });

      // Step 2: Create payment token (for credit card only)
      let cardToken = null;
      if (data.paymentMethod === "credit_card") {
        cardToken = await createPaymentToken(data);
      }

      // Step 3: Create transaction
      const result = await createTransaction(data, iuguCustomerId, buyerProfileId, cardToken);

      if (result.success) {
        // Redirect to our internal payment confirmation page
        const saleId = result.sale_id;
        window.location.href = `/payment-confirmation/${saleId}`;
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

  const handlePaymentProcess = (loading: boolean) => {
    setIsLoading(loading);
  };

  const getDisplayAmount = () => {
    if (isDonation) {
      const donationAmount = form.watch('donationAmount');
      if (donationAmount && donationAmount.trim() !== '') {
        const centavos = convertDonationToCents(donationAmount);
        return centavos;
      }
      return 0;
    }
    return product.price_cents;
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
            
            {/* Seção específica para doações */}
            {isDonation && (
              <DonationValueSection form={form} />
            )}
            
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
              productPriceCents={getDisplayAmount()}
            />

            <CheckoutButton 
              isLoading={isLoading}
              onPaymentProcess={handlePaymentProcess}
              formData={form.getValues()}
              product={product}
              paymentMethod={paymentMethod}
              cardData={paymentMethod === 'credit_card' ? {
                number: form.getValues().cardNumber || '',
                holderName: form.getValues().cardName || '',
                expiry: form.getValues().cardExpiry || '',
                cvv: form.getValues().cardCvv || ''
              } : undefined}
              installments={form.getValues().installments}
            />

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
