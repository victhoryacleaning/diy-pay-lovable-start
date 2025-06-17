
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
import { supabase } from "@/integrations/supabase/client";

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

  const donationAmount = form.watch('donationAmount');
  if (isDonation && onDonationAmountChange && donationAmount !== undefined) {
    onDonationAmountChange(donationAmount);
  }

  const validateRequiredFields = (data: CheckoutFormData) => {
    if (isDonation) {
      if (!data.donationAmount || data.donationAmount.trim() === "" || parseFloat(data.donationAmount.replace(/[^0-9,]/g, '').replace(',', '.')) <= 0) {
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
    let cleanValue = donationValue.replace(/[R$\s\.]/g, '').replace(',', '.');
    const numberValue = parseFloat(cleanValue);
    if (isNaN(numberValue) || numberValue <= 0) return 0;
    return Math.round(numberValue * 100);
  };

  const createIuguCustomer = async (data: CheckoutFormData) => {
    console.log('[DEBUG] Invocando get-or-create-iugu-customer via supabase.functions.invoke');
    
    const { data: result, error } = await supabase.functions.invoke('get-or-create-iugu-customer', {
      body: {
        email: data.email,
        name: data.fullName,
        cpf_cnpj: data.cpfCnpj,
        phone: data.phone,
      },
    });
    
    if (error) {
      console.error('[ERRO] Erro ao chamar get-or-create-iugu-customer:', error);
      throw error;
    }
    
    if (!result.success) {
      console.error('[ERRO] Resposta de erro da função:', result);
      throw new Error(result.error || "Falha ao criar cliente Iugu");
    }
    
    console.log('[DEBUG] Cliente Iugu criado/encontrado com sucesso:', result);
    return result;
  };
  
  // A LÓGICA DE TOKENIZAÇÃO DEVE SER REVISADA, USANDO INVOKE TAMBÉM
  const createPaymentToken = async (data: CheckoutFormData) => {
    // ...
    return null; // Placeholder
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (!validateRequiredFields(data)) {
      return;
    }

    setIsLoading(true);

    try {
      // PASSO 1: Obter/Criar cliente Iugu
      console.log('[DEBUG] PASSO 1: CRIANDO CLIENTE NA IUGU');
      const { iugu_customer_id, buyer_profile_id } = await createIuguCustomer(data);
      if (!iugu_customer_id) throw new Error("Falha ao obter ID do cliente Iugu");

      // PASSO 2: Obter token do cartão (se aplicável)
      console.log('[DEBUG] PASSO 2: PULANDO CRIAÇÃO DE TOKEN (MÉTODO NÃO É CREDIT_CARD)');
      // A lógica de tokenização precisa ser implementada aqui se for usar cartão
      const cardToken = null; 

      // PASSO 3: Preparar e enviar o payload da transação
      console.log('[DEBUG] PASSO 3: CRIANDO TRANSAÇÃO');

      // Montar o payload base
      const transactionPayload: any = {
        product_id: product.id,
        buyer_email: data.email,
        iugu_customer_id: iugu_customer_id,
        buyer_profile_id: buyer_profile_id,
        payment_method_selected: data.paymentMethod,
        card_token: cardToken,
        installments: data.installments,
        buyer_name: data.fullName,
        buyer_cpf_cnpj: data.cpfCnpj,
      };

      // *** CORREÇÃO CRÍTICA: Adicionar o valor da doação se for um produto de doação ***
      if (isDonation && data.donationAmount) {
        const donationCents = convertDonationToCents(data.donationAmount);
        transactionPayload.donation_amount_cents = donationCents;
      }

      console.log('[DEBUG] PAYLOAD FINAL SENDO ENVIADO:', transactionPayload);

      // Invocar a Edge Function com o payload completo e correto
      const { data: result, error: transactionError } = await supabase.functions.invoke(
        'create-iugu-transaction',
        { body: transactionPayload }
      );

      if (transactionError) {
        throw transactionError;
      }

      if (!result.success) {
        throw new Error(result.lugu_errors || "Falha ao processar pagamento.");
      }

      // Redirecionar para a página de confirmação
      window.location.href = `/payment-confirmation/${result.sale_id}`;

    } catch (error: any) {
      console.error('[ERRO] ERRO NO PROCESSO DE PAGAMENTO ***:', error);
      toast({
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro ao processar seu pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getDisplayAmount = () => {
    if (isDonation) {
      const donationValue = form.getValues('donationAmount');
      if (donationValue) return convertDonationToCents(donationValue);
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
            
            {isDonation && <DonationValueSection form={form} />}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">💸 Tem um cupom de desconto?</label>
              <p className="text-sm text-gray-500">Funcionalidade em breve!</p>
            </div>

            <PaymentMethodTabs
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              form={form}
              maxInstallments={product.max_installments_allowed}
              productPriceCents={getDisplayAmount()}
            />

            <CheckoutButton isLoading={isLoading} />

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-500">🔒 Pagamento processado por DIYPay</p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
