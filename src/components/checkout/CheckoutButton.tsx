
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
    console.log('[DEBUG] *** FRONTEND: INICIANDO PROCESSO DE PAGAMENTO ***');
    console.log('[DEBUG] Frontend: Dados do formulário:', formData);
    console.log('[DEBUG] Frontend: Método de pagamento:', paymentMethod);
    console.log('[DEBUG] Frontend: Dados do cartão:', cardData);
    console.log('[DEBUG] Frontend: Parcelas:', installments);

    onPaymentProcess(true);
    setProcessingStep("Processando...");

    try {
      // Step 1: Create or get Iugu customer
      setProcessingStep("Criando cliente...");
      console.log('[DEBUG] *** FRONTEND: PASSO 1 - CRIANDO CLIENTE NA IUGU ***');

      const customerPayload = {
        email: formData.email,
        name: formData.fullName,
        cpf_cnpj: formData.cpfCnpj,
        phone: formData.phone,
      };

      console.log('>>> FRONTEND: PAYLOAD para get-or-create-iugu-customer:', customerPayload);

      try {
        const customerResponse = await supabase.functions.invoke('get-or-create-iugu-customer', {
          body: customerPayload,
        });

        console.log('>>> FRONTEND: STATUS da resposta de get-or-create-iugu-customer:', customerResponse.error ? 'COM ERRO' : 'SEM ERRO');
        console.log('>>> FRONTEND: customerResponse.error:', customerResponse.error);
        console.log('>>> FRONTEND: customerResponse.data tipo:', typeof customerResponse.data);
        console.log('------------------------------------------------------');
        console.log('>>> FRONTEND: DADOS BRUTOS da resposta de get-or-create-iugu-customer ABAIXO:');
        console.log(customerResponse.data);
        console.log('>>> FRONTEND: FIM DOS DADOS BRUTOS de get-or-create-iugu-customer.');
        console.log('------------------------------------------------------');

        if (customerResponse.error) {
          console.error('>>> FRONTEND: ERRO HTTP ou RESPOSTA NÃO-JSON de get-or-create-iugu-customer. Resposta bruta já logada.');
          console.error('>>> FRONTEND: Erro na chamada da get-or-create-iugu-customer:', customerResponse.error);
          
          // Try to get more details from the error
          if (typeof customerResponse.error === 'object') {
            console.error('>>> FRONTEND: Detalhes do erro:', JSON.stringify(customerResponse.error, null, 2));
          }
          
          throw new Error(`Erro ao criar cliente: ${customerResponse.error.message || JSON.stringify(customerResponse.error)}`);
        }

        if (!customerResponse.data) {
          console.error('>>> FRONTEND: Resposta da função não contém data');
          throw new Error('Resposta inválida da função de criação de cliente');
        }

        console.log('>>> FRONTEND: DADOS PARSEADOS de get-or-create-iugu-customer:', customerResponse.data);

        const iuguCustomerId = customerResponse.data?.iugu_customer_id;
        console.log('>>> FRONTEND: ID do cliente Iugu obtido:', iuguCustomerId);

        if (!iuguCustomerId) {
          console.error('>>> FRONTEND: ID do cliente Iugu não retornado');
          console.error('>>> FRONTEND: Dados completos da resposta:', JSON.stringify(customerResponse.data, null, 2));
          throw new Error('ID do cliente não retornado');
        }

        // Lógica para prosseguir e chamar create-iugu-transaction
        if (customerResponse.data && customerResponse.data.iugu_customer_id) {
          console.log('>>> FRONTEND: Sucesso ao obter iugu_customer_id. Preparando para chamar create-iugu-transaction...');
          
          // Step 2: Handle payment method specific logic - ONLY for credit card
          let cardToken = null;

          if (paymentMethod === 'credit_card') {
            if (!cardData) {
              console.error('[ERRO] Frontend: Dados do cartão não fornecidos para pagamento com cartão');
              throw new Error('Dados do cartão são obrigatórios para pagamento com cartão de crédito');
            }

            setProcessingStep("Processando cartão...");
            console.log('[DEBUG] *** FRONTEND: PASSO 2 - CRIANDO TOKEN DO CARTÃO (APENAS PARA CREDIT_CARD) ***');

            const [firstName, ...lastNameParts] = (cardData.holderName || '').split(' ');
            const lastName = lastNameParts.join(' ');
            const [month, year] = (cardData.expiry || '').split('/');

            const tokenPayload = {
              card_number: cardData.number.replace(/\s/g, ''),
              verification_value: cardData.cvv,
              first_name: firstName,
              last_name: lastName,
              month: month,
              year: `20${year}`
            };

            console.log('[DEBUG] Frontend: Payload para create-iugu-payment-token:', tokenPayload);
            console.log('[DEBUG] Frontend: Preparando para chamar create-iugu-payment-token...');

            const tokenResponse = await supabase.functions.invoke('create-iugu-payment-token', {
              body: tokenPayload,
            });

            console.log('[DEBUG] *** FRONTEND: RESPOSTA DO create-iugu-payment-token ***');
            console.log('[DEBUG] Frontend: Status da resposta do token:', tokenResponse.error ? 'ERRO' : 'SUCESSO');
            console.log('[DEBUG] Frontend: tokenResponse.error:', tokenResponse.error);
            console.log('[DEBUG] Frontend: tokenResponse.data:', tokenResponse.data);

            if (tokenResponse.error) {
              console.error('[ERRO] Frontend: Erro na criação do token:', tokenResponse.error);
              throw new Error(`Erro ao processar cartão: ${tokenResponse.error.message || JSON.stringify(tokenResponse.error)}`);
            }

            cardToken = tokenResponse.data?.id;
            console.log('[DEBUG] Frontend: Token do cartão obtido:', cardToken);

            if (!cardToken) {
              console.error('[ERRO] Frontend: Token do cartão não retornado');
              console.error('[ERRO] Frontend: Dados completos da resposta do token:', JSON.stringify(tokenResponse.data, null, 2));
              throw new Error('Token do cartão não retornado');
            }
          } else {
            console.log('[DEBUG] *** FRONTEND: PASSO 2 - PULANDO CRIAÇÃO DE TOKEN (MÉTODO NÃO É CREDIT_CARD) ***');
            console.log('[DEBUG] Frontend: Método de pagamento é:', paymentMethod);
          }

          // Step 3: Create transaction
          setProcessingStep("Finalizando pagamento...");
          console.log('[DEBUG] *** FRONTEND: PASSO 3 - CRIANDO TRANSAÇÃO ***');
          console.log('[DEBUG] Frontend: Preparando para chamar create-iugu-transaction...');

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

          console.log('>>> FRONTEND: PREPARANDO PARA CHAMAR create-iugu-transaction com payload:', transactionPayload);

          const transactionResponse = await supabase.functions.invoke('create-iugu-transaction', {
            body: transactionPayload,
          });

          console.log('[DEBUG] *** FRONTEND: RESPOSTA DO create-iugu-transaction ***');
          console.log('[DEBUG] Frontend: Status da resposta da transação:', transactionResponse.error ? 'ERRO' : 'SUCESSO');
          console.log('[DEBUG] Frontend: transactionResponse.error:', transactionResponse.error);
          console.log('[DEBUG] Frontend: transactionResponse.data:', transactionResponse.data);

          if (transactionResponse.error) {
            console.error('[ERRO] Frontend: Erro na criação da transação:', transactionResponse.error);
            throw new Error(`Erro ao processar pagamento: ${transactionResponse.error.message || JSON.stringify(transactionResponse.error)}`);
          }

          const transactionData = transactionResponse.data;
          console.log('[DEBUG] Frontend: Dados da transação:', transactionData);

          if (!transactionData?.success) {
            console.error('[ERRO] Frontend: Transação não foi bem-sucedida:', transactionData);
            throw new Error(transactionData?.message || 'Falha no processamento do pagamento');
          }

          console.log('[DEBUG] *** FRONTEND: TRANSAÇÃO CRIADA COM SUCESSO ***');

          // Handle success based on payment method
          if (paymentMethod === 'credit_card' && transactionData.iugu_status === 'paid') {
            console.log('[DEBUG] Frontend: Pagamento com cartão aprovado imediatamente');
            toast({
              title: "Pagamento aprovado!",
              description: "Seu pagamento foi processado com sucesso.",
            });
          } else if (paymentMethod === 'pix' && transactionData.pix_qr_code_text) {
            console.log('[DEBUG] Frontend: PIX gerado com sucesso');
            // Show PIX QR code and instructions
            console.log('[DEBUG] Frontend: PIX QR Code:', transactionData.pix_qr_code_text);
            toast({
              title: "PIX gerado!",
              description: "Use o código PIX para finalizar o pagamento.",
            });
          } else if (paymentMethod === 'bank_slip' && transactionData.secure_url) {
            console.log('[DEBUG] Frontend: Boleto gerado com sucesso');
            // Redirect to bank slip
            console.log('[DEBUG] Frontend: URL do boleto:', transactionData.secure_url);
            window.open(transactionData.secure_url, '_blank');
            toast({
              title: "Boleto gerado!",
              description: "Você será redirecionado para o boleto.",
            });
          } else {
            console.log('[DEBUG] Frontend: Pagamento iniciado, redirecionando se necessário');
            toast({
              title: "Pagamento iniciado!",
              description: "Você será redirecionado para finalizar o pagamento.",
            });
            if (transactionData.secure_url) {
              window.open(transactionData.secure_url, '_blank');
            }
          }
        } else {
          console.error('>>> FRONTEND: iugu_customer_id não encontrado na resposta de get-or-create-iugu-customer ou resposta inválida.');
          throw new Error('ID do cliente não retornado pela função');
        }

      } catch (supabaseError) {
        console.error('>>> FRONTEND: Erro GERAL ao chamar/processar get-or-create-iugu-customer:', supabaseError);
        console.error('>>> FRONTEND: Tipo do erro do Supabase:', typeof supabaseError);
        console.error('>>> FRONTEND: Nome do erro do Supabase:', supabaseError.name);
        console.error('>>> FRONTEND: Mensagem do erro do Supabase:', supabaseError.message);
        if (supabaseError.stack) {
          console.error('>>> FRONTEND: Stack do erro do Supabase:', supabaseError.stack);
        }
        throw supabaseError; // Re-throw to be caught by outer catch
      }

    } catch (error) {
      console.error('[ERRO] *** FRONTEND: ERRO NO PROCESSO DE PAGAMENTO ***:', error);
      console.error('[ERRO] Frontend: Tipo do erro:', typeof error);
      console.error('[ERRO] Frontend: Nome do erro:', error.name);
      console.error('[ERRO] Frontend: Mensagem do erro:', error.message);
      console.error('[ERRO] Frontend: Stack do erro:', error.stack);
      
      toast({
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro ao processar seu pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      console.log('[DEBUG] Frontend: Finalizando processo de pagamento');
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
