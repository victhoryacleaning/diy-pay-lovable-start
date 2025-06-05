
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransactionPayload {
  product_id: string;
  buyer_email: string;
  iugu_customer_id?: string;
  payment_method_selected: 'credit_card' | 'pix' | 'bank_slip';
  card_token?: string;
  installments?: number;
  buyer_name?: string;
  buyer_cpf_cnpj?: string;
  notification_url_base?: string;
}

Deno.serve(async (req) => {
  console.log('[DEBUG] Iniciando create-iugu-transaction');
  console.log('[DEBUG] Método da requisição:', req.method);
  console.log('[DEBUG] Headers da requisição:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[DEBUG] Iniciando processamento principal da função');

    // Get environment and API keys
    const appEnv = Deno.env.get('APP_ENV') || 'test';
    const isProduction = appEnv === 'production';
    
    console.log('[DEBUG] APP_ENV:', appEnv);
    console.log('[DEBUG] isProduction:', isProduction);
    
    const iuguApiKey = isProduction 
      ? Deno.env.get('IUGU_API_KEY_LIVE')
      : Deno.env.get('IUGU_API_KEY_TEST');
    
    const iuguAccountId = isProduction
      ? Deno.env.get('IUGU_ACCOUNT_ID_LIVE')
      : Deno.env.get('IUGU_ACCOUNT_ID_TEST');

    const platformFeePercentage = parseFloat(Deno.env.get('PLATFORM_FEE_PERCENTAGE') || '0.05'); // Default 5%

    console.log('[DEBUG] Iugu API Key existe:', !!iuguApiKey);
    console.log('[DEBUG] Iugu Account ID existe:', !!iuguAccountId);
    console.log('[DEBUG] Platform fee percentage:', platformFeePercentage);

    if (!iuguApiKey || !iuguAccountId) {
      const errorMsg = 'Configuração da API da Iugu não encontrada para ambiente: ' + appEnv;
      console.error('[ERRO]', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: 'Configuração da API da Iugu não encontrada',
          functionName: 'create-iugu-transaction'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('[DEBUG] SUPABASE_URL existe:', !!supabaseUrl);
    console.log('[DEBUG] SUPABASE_SERVICE_ROLE_KEY existe:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = 'Variáveis de ambiente do Supabase não encontradas';
      console.error('[ERRO]', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: errorMsg,
          functionName: 'create-iugu-transaction'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[DEBUG] Cliente Supabase inicializado');

    // Parse request body
    console.log('[DEBUG] Tentando fazer parse do body da requisição');
    let payload: TransactionPayload;
    
    try {
      const requestText = await req.text();
      console.log('[DEBUG] Body bruto da requisição:', requestText);
      payload = JSON.parse(requestText);
      console.log('[DEBUG] Payload parseado:', payload);
    } catch (parseError) {
      const errorMsg = 'Erro ao fazer parse do JSON da requisição';
      console.error('[ERRO]', errorMsg, parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: errorMsg,
          functionName: 'create-iugu-transaction',
          details: parseError.toString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[DEBUG] Processando transação para produto:', payload.product_id);

    // Validate required fields
    if (!payload.product_id || !payload.buyer_email || !payload.payment_method_selected) {
      const errorMsg = 'Campos obrigatórios não informados';
      console.error('[ERRO]', errorMsg, { 
        product_id: !!payload.product_id, 
        buyer_email: !!payload.buyer_email, 
        payment_method_selected: !!payload.payment_method_selected 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: errorMsg,
          functionName: 'create-iugu-transaction'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get product data
    console.log('[DEBUG] Buscando dados do produto:', payload.product_id);
    let product;
    
    try {
      const { data, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', payload.product_id)
        .eq('is_active', true)
        .single();

      console.log('[DEBUG] Resultado da busca do produto:', { data, productError });

      if (productError || !data) {
        console.error('[ERRO] Produto não encontrado ou inativo:', productError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: true,
            message: 'Produto não encontrado ou inativo',
            functionName: 'create-iugu-transaction'
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      product = data;
      console.log('[DEBUG] Produto encontrado:', product);
    } catch (dbError) {
      console.error('[ERRO] Erro ao buscar produto no banco:', dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: 'Erro ao buscar produto',
          functionName: 'create-iugu-transaction',
          details: dbError.toString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate fees
    const amountTotalCents = product.price_cents;
    const platformFeeCents = Math.round(amountTotalCents * platformFeePercentage);
    const producerShareCents = amountTotalCents - platformFeeCents;

    console.log('[DEBUG] Cálculos de valores:', {
      amountTotalCents,
      platformFeeCents,
      producerShareCents,
      platformFeePercentage
    });

    // Validate installments
    const installments = payload.installments || 1;
    console.log('[DEBUG] Parcelas solicitadas:', installments, 'Máximo permitido:', product.max_installments_allowed);
    
    if (installments > product.max_installments_allowed) {
      const errorMsg = `Número máximo de parcelas permitidas: ${product.max_installments_allowed}`;
      console.error('[ERRO]', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: errorMsg,
          functionName: 'create-iugu-transaction'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create initial sale record
    console.log('[DEBUG] Criando registro de venda inicial');
    let sale;
    
    try {
      const { data, error: saleError } = await supabase
        .from('sales')
        .insert({
          product_id: payload.product_id,
          buyer_email: payload.buyer_email,
          amount_total_cents: amountTotalCents,
          platform_fee_cents: platformFeeCents,
          producer_share_cents: producerShareCents,
          payment_method_used: payload.payment_method_selected,
          installments_chosen: installments,
          status: 'pending'
        })
        .select()
        .single();

      console.log('[DEBUG] Resultado da criação da venda:', { data, saleError });

      if (saleError || !data) {
        console.error('[ERRO] Falha ao criar registro de venda:', saleError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: true,
            message: 'Erro ao criar registro de venda',
            functionName: 'create-iugu-transaction'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      sale = data;
      console.log('[DEBUG] Registro de venda criado:', sale.id);
    } catch (dbError) {
      console.error('[ERRO] Erro ao criar venda no banco:', dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: 'Erro ao criar registro de venda',
          functionName: 'create-iugu-transaction',
          details: dbError.toString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Basic Auth header for Iugu
    const authHeader = `Basic ${btoa(iuguApiKey + ':')}`;
    console.log('[DEBUG] Header de autenticação criado (primeiros 20 chars):', authHeader.substring(0, 20) + '...');

    // Prepare items for Iugu
    const items = [{
      description: product.name,
      quantity: 1,
      price_cents: product.price_cents
    }];
    console.log('[DEBUG] Items para Iugu:', items);

    let iuguResponse;
    let updateData: any = {};

    // Payment method specific logic
    if (payload.payment_method_selected === 'credit_card' && payload.card_token) {
      console.log('[DEBUG] Tentando cobrança direta com token do cartão');
      
      const chargePayload = {
        token: payload.card_token,
        email: payload.buyer_email,
        items: items,
        months: installments,
        ...(payload.iugu_customer_id && { customer_id: payload.iugu_customer_id })
      };

      console.log('[DEBUG] Payload para cobrança direta:', chargePayload);

      try {
        const chargeResponse = await fetch('https://api.iugu.com/v1/charge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(chargePayload),
        });

        console.log('[DEBUG] Status da resposta de cobrança:', chargeResponse.status);
        
        const chargeText = await chargeResponse.text();
        console.log('[DEBUG] Resposta bruta da cobrança:', chargeText);
        
        const chargeData = JSON.parse(chargeText);
        console.log('[DEBUG] Dados da cobrança parseados:', chargeData);

        if (chargeResponse.ok && chargeData.success) {
          console.log('[DEBUG] Cobrança direta bem-sucedida');
          // Direct charge successful
          updateData = {
            iugu_charge_id: chargeData.invoice_id,
            status: chargeData.status === 'paid' ? 'paid' : 'authorized',
            paid_at: chargeData.status === 'paid' ? new Date().toISOString() : null
          };

          iuguResponse = chargeData;
        } else {
          console.log('[DEBUG] Cobrança direta falhou, continuando com fatura:', chargeData);
          // Direct charge failed, fallback to invoice
          updateData.error_message_iugu = chargeData.errors ? JSON.stringify(chargeData.errors) : 'Falha na cobrança direta';
          
          // Continue to invoice creation below
        }
      } catch (error) {
        console.error('[ERRO] Erro na cobrança direta:', error);
        updateData.error_message_internal = 'Erro na tentativa de cobrança direta';
      }
    }

    // If direct charge wasn't successful or wasn't attempted, create invoice
    if (!iuguResponse || !iuguResponse.success) {
      console.log('[DEBUG] Criando fatura para método de pagamento:', payload.payment_method_selected);
      
      // Calculate due date
      let dueDate = new Date();
      if (payload.payment_method_selected === 'pix') {
        dueDate.setDate(dueDate.getDate() + 1); // D+1 for PIX
      } else if (payload.payment_method_selected === 'bank_slip') {
        dueDate.setDate(dueDate.getDate() + 3); // D+3 for bank slip
      } else {
        dueDate.setDate(dueDate.getDate() + 1); // D+1 for credit card invoice
      }

      const invoicePayload: any = {
        email: payload.buyer_email,
        due_date: dueDate.toISOString().split('T')[0], // YYYY-MM-DD format
        items: items,
        payable_with: payload.payment_method_selected,
        ...(payload.iugu_customer_id && { customer_id: payload.iugu_customer_id }),
        ...(payload.notification_url_base && { 
          notification_url: `${payload.notification_url_base}?sale_id=${sale.id}` 
        })
      };

      // Add payment method specific fields
      if (payload.payment_method_selected === 'credit_card') {
        invoicePayload.max_installments = product.max_installments_allowed;
        if (payload.card_token) {
          invoicePayload.token = payload.card_token;
        }
      }

      if (payload.payment_method_selected === 'bank_slip' && payload.buyer_name && payload.buyer_cpf_cnpj) {
        invoicePayload.payer = {
          name: payload.buyer_name,
          cpf_cnpj: payload.buyer_cpf_cnpj
        };
      }

      console.log('[DEBUG] Payload para criar fatura:', invoicePayload);

      try {
        const invoiceResponse = await fetch('https://api.iugu.com/v1/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(invoicePayload),
        });

        console.log('[DEBUG] Status da resposta da fatura:', invoiceResponse.status);
        
        const invoiceText = await invoiceResponse.text();
        console.log('[DEBUG] Resposta bruta da fatura:', invoiceText);
        
        const invoiceData = JSON.parse(invoiceText);
        console.log('[DEBUG] Dados da fatura parseados:', invoiceData);

        if (invoiceResponse.ok && invoiceData.id) {
          console.log('[DEBUG] Fatura criada com sucesso:', invoiceData.id);
          // Invoice created successfully
          updateData = {
            ...updateData,
            iugu_invoice_id: invoiceData.id,
            status: 'pending',
            iugu_invoice_secure_url: invoiceData.secure_url,
            iugu_pix_qr_code_text: invoiceData.pix?.qr_code,
            iugu_pix_qr_code_base64: invoiceData.pix?.qr_code_base64,
            iugu_bank_slip_barcode: invoiceData.bank_slip?.barcode
          };

          iuguResponse = invoiceData;
        } else {
          console.error('[ERRO] Criação de fatura falhou:', invoiceData);
          updateData.error_message_iugu = invoiceData.errors ? JSON.stringify(invoiceData.errors) : 'Falha na criação da fatura';
          updateData.status = 'failed';
        }
      } catch (error) {
        console.error('[ERRO] Erro ao criar fatura:', error);
        updateData.error_message_internal = 'Erro na criação da fatura';
        updateData.status = 'failed';
      }
    }

    // Update sale record with Iugu response
    console.log('[DEBUG] Atualizando registro de venda com dados da Iugu:', updateData);
    
    try {
      const { error: updateError } = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', sale.id);

      if (updateError) {
        console.error('[ERRO] Falha ao atualizar registro de venda:', updateError);
      } else {
        console.log('[DEBUG] Registro de venda atualizado com sucesso');
      }
    } catch (updateError) {
      console.error('[ERRO] Erro ao atualizar venda no banco:', updateError);
    }

    // Prepare response
    if (iuguResponse && (iuguResponse.success || iuguResponse.id)) {
      const responseData: any = {
        success: true,
        sale_id: sale.id,
        payment_method: payload.payment_method_selected,
      };

      if (updateData.iugu_charge_id) {
        responseData.iugu_charge_id = updateData.iugu_charge_id;
        responseData.iugu_status = updateData.status;
      }

      if (updateData.iugu_invoice_id) {
        responseData.iugu_invoice_id = updateData.iugu_invoice_id;
        responseData.secure_url = updateData.iugu_invoice_secure_url;
        responseData.pix_qr_code_text = updateData.iugu_pix_qr_code_text;
        responseData.pix_qr_code_base64 = updateData.iugu_pix_qr_code_base64;
        responseData.bank_slip_barcode = updateData.iugu_bank_slip_barcode;
      }

      console.log('[DEBUG] Retornando resposta de sucesso:', responseData);
      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorResponse = { 
        success: false, 
        sale_id: sale.id,
        message: 'Falha no processamento do pagamento',
        iugu_errors: updateData.error_message_iugu,
        internal_errors: updateData.error_message_internal,
        functionName: 'create-iugu-transaction'
      };
      console.log('[DEBUG] Retornando resposta de erro:', errorResponse);
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('[ERRO] Erro geral na create-iugu-transaction:', error.message);
    console.error('[ERRO] Stack trace:', error.stack);
    console.error('[ERRO] Erro completo:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: true,
        message: 'Erro interno do servidor', 
        details: error.message,
        functionName: 'create-iugu-transaction'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
