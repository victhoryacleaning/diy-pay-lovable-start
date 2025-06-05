
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CheckoutButtonProps {
  isLoading: boolean;
  onPaymentProcess: (isLoading: boolean) => void;
  formData: any;
  product: any;
  paymentMethod: string;
  cardData?: any;
  installments?: number;
}

export const CheckoutButton = ({
  isLoading,
  onPaymentProcess,
  formData,
  product,
  paymentMethod,
  cardData,
  installments
}: CheckoutButtonProps) => {
  const [processingStep, setProcessingStep] = useState<string>("");

  const handlePayment = async () => {
    console.log('[DEBUG] Iniciando processo de pagamento');
    console.log('[DEBUG] Dados do formulário:', formData);
    console.log('[DEBUG] Método de pagamento:', paymentMethod);
    console.log('[DEBUG] Dados do cartão:', cardData);
    console.log('[DEBUG] Parcelas:', installments);

    onPaymentProcess(true);
    setProcessingStep("Processando...");

    try {
      // Step 1: Create or get Iugu customer
      setProcessingStep("Criando cliente...");
      console.log('[DEBUG] Passo 1: Criando cliente na Iugu');

      const customerPayload = {
        email: formData.email,
        name: formData.fullName,
        cpf_cnpj: formData.cpfCnpj,
        phone: formData.phone,
      };

      console.log('[DEBUG] Payload para get-or-create-iugu-customer:', customerPayload);

      const customerResponse = await supabase.functions.invoke('get-or-create-iugu-customer', {
        body: customerPayload,
      });

      console.log('[DEBUG] Resposta bruta do get-or-create-iugu-customer:', customerResponse);
      console.log('[DEBUG] Status da resposta:', customerResponse.error ? 'erro' : 'sucesso');
      console.log('[DEBUG] Dados da resposta:', customerResponse.data);

      if (customerResponse.error) {
        console.error('[ERRO] Erro na criação do cliente:', customerResponse.error);
        throw new Error(`Erro ao criar cliente: ${customerResponse.error.message}`);
      }

      const iuguCustomerId = customerResponse.data?.iugu_customer_id;
      console.log('[DEBUG] ID do cliente Iugu obtido:', iuguCustomerId);

      if (!iuguCustomerId) {
        console.error('[ERRO] ID do cliente Iugu não retornado');
        throw new Error('ID do cliente não retornado');
      }

      // Step 2: Handle payment method specific logic
      let cardToken = null;

      if (paymentMethod === 'credit_card' && cardData) {
        setProcessingStep("Processando cartão...");
        console.log('[DEBUG] Passo 2: Criando token do cartão');

        const tokenPayload = {
          account_id: "test", // This will be handled by the edge function
          method: "credit_card",
          test: true,
          data: {
            number: cardData.number.replace(/\s/g, ''),
            verification_value: cardData.cvv,
            first_name: cardData.holderName.split(' ')[0] || '',
            last_name: cardData.holderName.split(' ').slice(1).join(' ') || '',
            month: cardData.expiry.split('/')[0],
            year: cardData.expiry.split('/')[1]
          }
        };

        console.log('[DEBUG] Payload para create-iugu-payment-token:', tokenPayload);

        const tokenResponse = await supabase.functions.invoke('create-iugu-payment-token', {
          body: tokenPayload,
        });

        console.log('[DEBUG] Resposta bruta do create-iugu-payment-token:', tokenResponse);

        if (tokenResponse.error) {
          console.error('[ERRO] Erro na criação do token:', tokenResponse.error);
          throw new Error(`Erro ao processar cartão: ${tokenResponse.error.message}`);
        }

        cardToken = tokenResponse.data?.id;
        console.log('[DEBUG] Token do cartão obtido:', cardToken);

        if (!cardToken) {
          console.error('[ERRO] Token do cartão não retornado');
          throw new Error('Token do cartão não retornado');
        }
      }

      // Step 3: Create transaction
      setProcessingStep("Finalizando pagamento...");
      console.log('[DEBUG] Passo 3: Criando transação');

      const transactionPayload = {
        product_id: product.id,
        buyer_email: formData.email,
        iugu_customer_id: iuguCustomerId,
        payment_method_selected: paymentMethod,
        buyer_name: formData.fullName,
        buyer_cpf_cnpj: formData.cpfCnpj,
        ...(cardToken && { card_token: cardToken }),
        ...(installments && { installments }),
        notification_url_base: `${window.location.origin}/webhook`
      };

      console.log('[DEBUG] Payload para create-iugu-transaction:', transactionPayload);

      const transactionResponse = await supabase.functions.invoke('create-iugu-transaction', {
        body: transactionPayload,
      });

      console.log('[DEBUG] Resposta bruta do create-iugu-transaction:', transactionResponse);

      if (transactionResponse.error) {
        console.error('[ERRO] Erro na criação da transação:', transactionResponse.error);
        throw new Error(`Erro ao processar pagamento: ${transactionResponse.error.message}`);
      }

      const transactionData = transactionResponse.data;
      console.log('[DEBUG] Dados da transação:', transactionData);

      if (!transactionData?.success) {
        console.error('[ERRO] Transação não foi bem-sucedida:', transactionData);
        throw new Error(transactionData?.message || 'Falha no processamento do pagamento');
      }

      // Handle success based on payment method
      if (paymentMethod === 'credit_card' && transactionData.iugu_status === 'paid') {
        toast({
          title: "Pagamento aprovado!",
          description: "Seu pagamento foi processado com sucesso.",
        });
      } else if (paymentMethod === 'pix' && transactionData.pix_qr_code_text) {
        // Show PIX QR code and instructions
        console.log('[DEBUG] PIX QR Code:', transactionData.pix_qr_code_text);
        toast({
          title: "PIX gerado!",
          description: "Use o código PIX para finalizar o pagamento.",
        });
      } else if (paymentMethod === 'bank_slip' && transactionData.secure_url) {
        // Redirect to bank slip
        console.log('[DEBUG] URL do boleto:', transactionData.secure_url);
        window.open(transactionData.secure_url, '_blank');
        toast({
          title: "Boleto gerado!",
          description: "Você será redirecionado para o boleto.",
        });
      } else {
        toast({
          title: "Pagamento iniciado!",
          description: "Você será redirecionado para finalizar o pagamento.",
        });
        if (transactionData.secure_url) {
          window.open(transactionData.secure_url, '_blank');
        }
      }

    } catch (error) {
      console.error('[ERRO] Erro no processo de pagamento:', error);
      toast({
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro ao processar seu pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      onPaymentProcess(false);
      setProcessingStep("");
    }
  };

  return (
    <Button 
      onClick={handlePayment}
      disabled={isLoading}
      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
    >
      {isLoading ? processingStep : "Pagar agora"}
    </Button>
  );
};
