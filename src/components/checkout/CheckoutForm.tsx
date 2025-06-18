import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { EmailSection } from "./EmailSection";
import { PaymentMethodTabs } from "./PaymentMethodTabs";
import { CheckoutButton } from "./CheckoutButton";
import { DonationValueSection } from "./DonationValueSection";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface Product {
  id: string;
  name: string;
  price_cents: number;
  max_installments_allowed: number;
  product_type?: string;
  donation_title?: string;
  donation_description?: string;
  allowed_payment_methods: Json;
}

interface CheckoutFormProps {
  product: Product;
  onDonationAmountChange?: (amount: string) => void;
}

const checkoutSchema = z.object({
  fullName: z.string().min(2, "Nome completo é obrigatório"),
  phone: z.string().optional(),
  cpfCnpj: z.string().optional(),
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

  // Convert Json to string array with fallback
  const allowedPaymentMethods = Array.isArray(product.allowed_payment_methods) 
    ? product.allowed_payment_methods as string[]
    : ["credit_card", "pix", "bank_slip"];

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: "credit_card",
      installments: 1,
      saveData: false,
      donationAmount: isDonation ? "" : undefined,
    },
  });

  const donationAmount = form.watch('donationAmount');
  if (isDonation && donationAmount !== undefined) {
    onDonationAmountChange(donationAmount);
  }

  const validateRequiredFields = (data: CheckoutFormData): boolean => {
    if (isDonation) {
      if (!data.donationAmount || convertToCents(data.donationAmount) === 0) {
        toast({ 
          title: "Valor obrigatório", 
          description: "Por favor, informe um valor válido para a doação.", 
          variant: "destructive" 
        });
        return false;
      }
    }
    if (data.paymentMethod === "bank_slip" && (!data.fullName || !data.cpfCnpj)) {
      toast({ 
        title: "Campos obrigatórios", 
        description: "Nome completo e CPF/CNPJ são obrigatórios para boleto.", 
        variant: "destructive" 
      });
      return false;
    }
    if (data.paymentMethod === "credit_card" && (!data.cardNumber || !data.cardName || !data.cardExpiry || !data.cardCvv)) {
      toast({ 
        title: "Campos obrigatórios", 
        description: "Todos os dados do cartão são obrigatórios.", 
        variant: "destructive" 
      });
      return false;
    }
    return true;
  };

  const convertToCents = (value: string | undefined): number => {
    if (!value) return 0;
    const cleanValue = value.replace(/[R$\s\.]/g, '').replace(',', '.');
    const numberValue = parseFloat(cleanValue);
    if (isNaN(numberValue) || numberValue <= 0) return 0;
    return Math.round(numberValue * 100);
  };
  
  const createIuguCustomer = async (data: CheckoutFormData) => {
    const { data: result, error } = await supabase.functions.invoke('get-or-create-iugu-customer', {
      body: { email: data.email, name: data.fullName, cpf_cnpj: data.cpfCnpj, phone: data.phone },
    });
    if (error) throw new Error('Erro ao criar ou buscar cliente Iugu.');
    return result;
  };
  
  const createPaymentToken = async (data: CheckoutFormData) => {
    if (data.paymentMethod !== "credit_card" || !data.cardName || !data.cardExpiry || !data.cardCvv) return null;
    
    const [firstName, ...lastNameParts] = data.cardName.split(' ');
    const lastName = lastNameParts.join(' ');
    const [month, year] = data.cardExpiry.split('/');

    const { data: result, error } = await supabase.functions.invoke('create-iugu-payment-token', {
      body: {
        card_number: data.cardNumber?.replace(/\s/g, ''),
        verification_value: data.cardCvv,
        first_name: firstName,
        last_name: lastName,
        month,
        year: `20${year}`,
      },
    });
    if (error) throw new Error('Erro ao tokenizar cartão.');
    return result.id;
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (!validateRequiredFields(data)) return;
    setIsLoading(true);

    try {
      const customerResponse = await createIuguCustomer(data);
      if (!customerResponse.success) throw new Error(customerResponse.error || "Falha ao criar cliente Iugu");
      const { iugu_customer_id, buyer_profile_id } = customerResponse;

      const cardToken = await createPaymentToken(data);

      const transactionPayload: any = {
        product_id: product.id,
        buyer_email: data.email,
        iugu_customer_id,
        buyer_profile_id,
        payment_method_selected: data.paymentMethod,
        card_token: cardToken,
        installments: data.installments,
        buyer_name: data.fullName,
        buyer_cpf_cnpj: data.cpfCnpj,
      };

      if (isDonation) {
        transactionPayload.donation_amount_cents = convertToCents(data.donationAmount);
      }
      
      console.log('[DEBUG] PAYLOAD FINAL SENDO ENVIADO:', transactionPayload);

      const { data: result, error: transactionError } = await supabase.functions.invoke(
        'create-iugu-transaction',
        { body: transactionPayload }
      );

      if (transactionError) throw transactionError;
      if (!result.success) {
        const errorMessage = result.lugu_errors ? JSON.stringify(result.lugu_errors) : "Falha ao processar pagamento.";
        throw new Error(errorMessage);
      }
      
      window.location.href = `/payment-confirmation/${result.sale_id}`;

    } catch (error: any) {
      console.error('[ERRO] NO PROCESSO DE PAGAMENTO:', error);
      toast({
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro ao processar seu pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getDisplayAmount = (): number => {
    if (isDonation) {
      const donationValue = form.getValues('donationAmount');
      return convertToCents(donationValue);
    }
    return product.price_cents;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-gray-200 shadow-lg bg-white">
        <CardContent className="px-4 sm:px-8 pb-8 pt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Personal Info Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                <PersonalInfoSection form={form} />
              </div>

              {/* Email Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                <EmailSection form={form} />
              </div>
              
              {/* Donation Section */}
              {isDonation && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                  <DonationValueSection 
                    form={form}
                    title={product.donation_title}
                    description={product.donation_description}
                  />
                </div>
              )}
              
              {/* Discount Coupon Teaser */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600 text-lg">🎟️</span>
                  <div>
                    <label className="text-sm font-semibold text-blue-900">Tem um cupom de desconto?</label>
                    <p className="text-xs text-blue-700">Funcionalidade em breve!</p>
                  </div>
                </div>
              </div>

              {/* Payment Methods Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                <PaymentMethodTabs
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  form={form}
                  maxInstallments={product.max_installments_allowed}
                  productPriceCents={getDisplayAmount()}
                  product={{
                    allowed_payment_methods: allowedPaymentMethods
                  }}
                />
              </div>

              {/* Checkout Button */}
              <div className="pt-4">
                <CheckoutButton isLoading={isLoading} />
              </div>

              {/* Footer */}
              <div className="text-center pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">🔒</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Pagamento 100% seguro processado por <span className="font-bold text-green-600">DIYPay</span>
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Seus dados estão protegidos com criptografia SSL
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
