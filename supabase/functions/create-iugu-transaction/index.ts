
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
      installments,
      buyer_name,
      buyer_cpf_cnpj,
      donation_amount_cents,
      quantity,
      attendees,
    } = await req.json();

    // --- Validação dos Dados de Entrada ---
    if (!product_id || !iugu_customer_id) {
      throw new Error('Product ID e Iugu Customer ID são obrigatórios.');
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

      // --- Inserir a Venda no Nosso Banco de Dados ---
      const saleData = {
        product_id,
        buyer_profile_id,
        buyer_email,
        iugu_invoice_id: invoiceResult.id,
        amount_total_cents,
        payment_method_used: payment_method_selected,
        installments_chosen: installments || 1,
        iugu_status: invoiceResult.status, // Status inicial da fatura (geralmente 'pending')
        status: 'pending_payment', // Nosso status interno inicial
        iugu_invoice_secure_url: invoiceResult.secure_url,
        iugu_pix_qr_code_text: invoiceResult.pix?.qrcode_text || invoiceResult.pix?.emv || null,
        iugu_pix_qr_code_base64: invoiceResult.pix?.qrcode_base64 || invoiceResult.pix?.qrcode || null,
        iugu_bank_slip_barcode: invoiceResult.bank_slip?.barcode || invoiceResult.bank_slip?.digitable_line || invoiceResult.digitable_line || null,
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
          message: 'Transação iniciada com sucesso via Iugu.',
          sale_id: newSale.id,
          iugu_invoice_id: invoiceResult.id,
          status: invoiceResult.status,
          gateway_used: activeGateway.gateway_name,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (activeGateway.gateway_identifier === 'stripe') {
      console.log('[STRIPE_GATEWAY] Gateway Stripe selecionado. Lógica a ser implementada.');
      throw new Error('O gateway Stripe ainda não está implementado.');
      
    } else if (activeGateway.gateway_identifier === 'mercadopago') {
      console.log('[MERCADOPAGO_GATEWAY] Gateway Mercado Pago selecionado. Lógica a ser implementada.');
      throw new Error('O gateway Mercado Pago ainda não está implementado.');
      
    } else if (activeGateway.gateway_identifier === 'asaas') {
      console.log('[ASAAS_GATEWAY] Gateway Asaas selecionado. Lógica a ser implementada.');
      throw new Error('O gateway Asaas ainda não está implementado.');
      
    } else {
      console.error(`[GATEWAY_UNSUPPORTED] Gateway não suportado: ${activeGateway.gateway_identifier}`);
      throw new Error(`Gateway "${activeGateway.gateway_identifier}" não é suportado.`);
    }

  } catch (error) {
    console.error('[TRANSACTION_ERROR] Erro no processo de criação da transação:', error.message);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
