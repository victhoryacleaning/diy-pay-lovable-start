// Force redeploy
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      product_id,
      buyer_email,
      iugu_customer_id,
      buyer_profile_id,
      payment_method_selected,
      card_token,
      credit_card_token,
      installments,
      buyer_name,
      buyer_cpf_cnpj,
      donation_amount_cents,
      quantity,
      attendees,
    } = await req.json();

    // --- Validação dos Dados de Entrada ---
    if (!product_id) {
      throw new Error('Product ID é obrigatório.');
    }

    // --- Buscar o Gateway Ativo ---
    console.log('[GATEWAY_CHECK] Buscando gateway de pagamento ativo...');
    const { data: activeGateway, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('gateway_identifier, credentials, gateway_name')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (gatewayError || !activeGateway) {
      console.error('[GATEWAY_ERROR] Nenhum gateway ativo encontrado:', gatewayError);
      throw new Error('Nenhum gateway de pagamento ativo configurado na plataforma.');
    }

    console.log(`[GATEWAY_SELECTED] Gateway ativo: ${activeGateway.gateway_name} (${activeGateway.gateway_identifier})`);

    // --- Buscar Detalhes do Produto ---
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name, price_cents, producer_id, max_installments_allowed')
      .eq('id', product_id)
      .single();

    if (productError) throw productError;

    // --- Determinar o Valor Total da Transação ---
    let amount_total_cents = 0;
    if (donation_amount_cents && donation_amount_cents > 0) {
      amount_total_cents = donation_amount_cents;
    } else {
      amount_total_cents = product.price_cents * (quantity || 1);
    }

    let gatewayResponse: any = null;

    // --- Roteamento baseado no Gateway Ativo ---
    if (activeGateway.gateway_identifier === 'iugu') {
      console.log('[IUGU_GATEWAY] Processando transação via Iugu...');
      
      // Validar credenciais do Iugu
      const { api_key, account_id } = activeGateway.credentials || {};
      if (!api_key) {
        throw new Error('Credenciais para o gateway Iugu não estão configuradas. Verifique a API Key.');
      }

      console.log('[IUGU_GATEWAY] Credenciais validadas, criando fatura...');

      // LÓGICA UNIFICADA: Criar uma Fatura para TODOS os métodos de pagamento
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3); // Vencimento em 3 dias

      const invoicePayload: any = {
        email: buyer_email,
        due_date: dueDate.toISOString().split('T')[0],
        customer_id: iugu_customer_id,
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/iugu-webhook-handler`,
        items: [{
          description: product.name,
          quantity: quantity || 1,
          price_cents: product.price_cents
        }],
        payer: {
          cpf_cnpj: buyer_cpf_cnpj,
          name: buyer_name,
        },
      };

      // Adiciona o método de pagamento e parcelas se for cartão de crédito
      if (payment_method_selected === 'credit_card') {
        if (!card_token) {
          throw new Error('Token do cartão de crédito é obrigatório para este método de pagamento.');
        }
        invoicePayload.customer_payment_method_id = null; // Garante que não usará um método salvo
        invoicePayload.token = card_token; // Paga a fatura com o token do cartão
        invoicePayload.months = installments > 1 ? installments : null; // Define as parcelas
      } else {
        // Para PIX e Boleto, define o método aceito na fatura
        invoicePayload.payable_with = payment_method_selected === 'bank_slip' ? 'bank_slip' : 'pix';
      }

      // --- Chamar a API da Iugu para Criar a Fatura ---
      const authHeader = `Basic ${btoa(api_key + ':')}`;
      const invoiceResponse = await fetch('https://api.iugu.com/v1/invoices', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoicePayload),
      });

      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.text();
        console.error('[IUGU_INVOICE_ERROR]', errorData);
        throw new Error('Falha ao criar fatura na Iugu.');
      }

      const invoiceResult = await invoiceResponse.json();
      console.log(`[IUGU_INVOICE_SUCCESS] Fatura criada com sucesso. ID: ${invoiceResult.id}`);

      // Padronizar resposta da Iugu
      gatewayResponse = {
        id: invoiceResult.id,
        status: invoiceResult.status,
        secure_url: invoiceResult.secure_url,
        pix_qr_code_text: invoiceResult.pix?.qrcode_text || invoiceResult.pix?.emv || null,
        pix_qr_code_base64: invoiceResult.pix?.qrcode_base64 || invoiceResult.pix?.qrcode || null,
        bank_slip_barcode: invoiceResult.bank_slip?.barcode || invoiceResult.bank_slip?.digitable_line || invoiceResult.digitable_line || null,
        gateway_name: 'Iugu'
      };

    } else if (activeGateway.gateway_identifier === 'asaas') {
      console.log('[ASAAS_GATEWAY] Processando transação via Asaas...');
      
      // Validar credenciais do Asaas
      const { api_key } = activeGateway.credentials || {};
      if (!api_key) {
        throw new Error('Credenciais para o gateway Asaas não estão configuradas. Verifique a API Key.');
      }

      console.log('[ASAAS_GATEWAY] Credenciais validadas, criando cobrança...');

      // Mapear método de pagamento para o formato do Asaas
      let billingType = 'CREDIT_CARD';
      if (payment_method_selected === 'pix') {
        billingType = 'PIX';
      } else if (payment_method_selected === 'bank_slip') {
        billingType = 'BOLETO';
      }

      // Preparar dados do cliente
      const customerData = {
        name: buyer_name,
        email: buyer_email,
        cpfCnpj: buyer_cpf_cnpj,
      };

      // Criar ou buscar cliente no Asaas
      let asaasCustomerId = null;
      
      // Tentar criar cliente
      const customerResponse = await fetch('https://sandbox.asaas.com/api/v3/customers', {
        method: 'POST',
        headers: {
          'access_token': api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (customerResponse.ok) {
        const customerResult = await customerResponse.json();
        asaasCustomerId = customerResult.id;
        console.log(`[ASAAS_CUSTOMER_SUCCESS] Cliente criado: ${asaasCustomerId}`);
      } else {
        // Se falhar ao criar, pode ser que já exista - tentar buscar
        const searchResponse = await fetch(`https://sandbox.asaas.com/api/v3/customers?email=${buyer_email}`, {
          headers: {
            'access_token': api_key,
          },
        });
        
        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          if (searchResult.data && searchResult.data.length > 0) {
            asaasCustomerId = searchResult.data[0].id;
            console.log(`[ASAAS_CUSTOMER_FOUND] Cliente encontrado: ${asaasCustomerId}`);
          }
        }
      }

      if (!asaasCustomerId) {
        throw new Error('Não foi possível criar ou encontrar cliente no Asaas.');
      }

      // Calcular data de vencimento
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      // Preparar payload da cobrança
      const paymentPayload: any = {
        customer: asaasCustomerId,
        billingType: billingType,
        value: amount_total_cents / 100, // Asaas espera valor em reais
        dueDate: dueDate.toISOString().split('T')[0],
        description: product.name,
        externalReference: product_id,
      };

      // Adicionar dados do cartão se for cartão de crédito
      if (payment_method_selected === 'credit_card' && credit_card_token) {
        paymentPayload.creditCard = {
          creditCardToken: credit_card_token,
        };
        
        if (installments > 1) {
          paymentPayload.installmentCount = installments;
        }
      }

      console.log('[ASAAS_PAYLOAD]', JSON.stringify(paymentPayload, null, 2));

      // Criar cobrança no Asaas
      const paymentResponse = await fetch('https://sandbox.asaas.com/api/v3/payments', {
        method: 'POST',
        headers: {
          'access_token': api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentPayload),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.text();
        console.error('[ASAAS_PAYMENT_ERROR]', errorData);
        throw new Error('Falha ao criar cobrança no Asaas.');
      }

      const paymentResult = await paymentResponse.json();
      console.log(`[ASAAS_PAYMENT_SUCCESS] Cobrança criada com sucesso. ID: ${paymentResult.id}`);

      let pixData = { qrCodeBase64: null, qrCodeText: null };

      // ETAPA ADICIONAL E CRUCIAL PARA PIX - Segunda chamada de API
      if (billingType === 'PIX') {
        console.log(`[ASAAS_PIX] Cobrança PIX criada. Buscando dados do QR Code para ${paymentResult.id}...`);
        const pixQrCodeResponse = await fetch(`https://sandbox.asaas.com/api/v3/payments/${paymentResult.id}/pixQrCode`, {
          headers: { 'access_token': api_key }
        });

        if (pixQrCodeResponse.ok) {
          const pixQrCodeData = await pixQrCodeResponse.json();
          pixData.qrCodeBase64 = pixQrCodeData.encodedImage;
          pixData.qrCodeText = pixQrCodeData.payload;
          console.log('[ASAAS_PIX] Dados do QR Code obtidos com sucesso.');
          console.log('[ASAAS_PIX_DEBUG] QR Code Data:', JSON.stringify(pixQrCodeData, null, 2));
        } else {
          console.error('[ASAAS_PIX_ERROR] Falha ao buscar dados do QR Code.');
        }
      }

      // Padronizar resposta do Asaas
      gatewayResponse = {
        id: paymentResult.id,
        status: paymentResult.status,
        secure_url: paymentResult.invoiceUrl,
        // Usar dados da segunda chamada para PIX ou fallback para dados da primeira chamada
        pix_qr_code_text: pixData.qrCodeText || paymentResult.pixQrCode?.payload || null,
        pix_qr_code_base64: pixData.qrCodeBase64 || paymentResult.pixQrCode?.encodedImage || null,
        // Mapeamento dos campos de Boleto do Asaas
        bank_slip_barcode: paymentResult.identificationField || paymentResult.nossoNumero || null,
        gateway_name: 'Asaas'
      };

    } else if (activeGateway.gateway_identifier === 'stripe') {
      console.log('[STRIPE_GATEWAY] Gateway Stripe selecionado. Lógica a ser implementada.');
      throw new Error('O gateway Stripe ainda não está implementado.');
      
    } else if (activeGateway.gateway_identifier === 'mercadopago') {
      console.log('[MERCADOPAGO_GATEWAY] Gateway Mercado Pago selecionado. Lógica a ser implementada.');
      throw new Error('O gateway Mercado Pago ainda não está implementado.');
      
    } else {
      console.error(`[GATEWAY_UNSUPPORTED] Gateway não suportado: ${activeGateway.gateway_identifier}`);
      throw new Error(`Gateway "${activeGateway.gateway_identifier}" não é suportado.`);
    }

    // --- Inserir a Venda no Nosso Banco de Dados (Usando as novas colunas genéricas) ---
    const saleData = {
      product_id,
      buyer_profile_id,
      buyer_email,
      gateway_transaction_id: gatewayResponse.id,
      gateway_identifier: activeGateway.gateway_identifier,
      gateway_status: gatewayResponse.status,
      gateway_payment_url: gatewayResponse.secure_url,
      gateway_pix_qrcode_text: gatewayResponse.pix_qr_code_text,
      gateway_pix_qrcode_base64: gatewayResponse.pix_qr_code_base64,
      gateway_bank_slip_barcode: gatewayResponse.bank_slip_barcode,
      amount_total_cents,
      payment_method_used: payment_method_selected,
      installments_chosen: installments || 1,
      status: 'pending_payment',
      platform_fee_cents: 0, // Será calculado posteriormente
      producer_share_cents: 0, // Será calculado posteriormente
      event_attendees: attendees,
    };
    
    const { data: newSale, error: insertError } = await supabase
      .from('sales')
      .insert([saleData])
      .select()
      .single();

    if (insertError) {
      console.error('[DB_INSERT_ERROR] Falha ao salvar a venda:', insertError);
      throw new Error('Falha ao registrar a venda no banco de dados.');
    }

    // --- Retornar Resposta de Sucesso ---
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Transação iniciada com sucesso via ${gatewayResponse.gateway_name}.`,
        sale_id: newSale.id,
        gateway_transaction_id: gatewayResponse.id,
        status: gatewayResponse.status,
        gateway_used: gatewayResponse.gateway_name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TRANSACTION_ERROR] Erro no processo de criação da transação:', error.message);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
