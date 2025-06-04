
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment and API keys
    const appEnv = Deno.env.get('APP_ENV') || 'test';
    const isProduction = appEnv === 'production';
    
    const iuguApiKey = isProduction 
      ? Deno.env.get('IUGU_API_KEY_LIVE')
      : Deno.env.get('IUGU_API_KEY_TEST');
    
    const iuguAccountId = isProduction
      ? Deno.env.get('IUGU_ACCOUNT_ID_LIVE')
      : Deno.env.get('IUGU_ACCOUNT_ID_TEST');

    const platformFeePercentage = parseFloat(Deno.env.get('PLATFORM_FEE_PERCENTAGE') || '0.05'); // Default 5%

    if (!iuguApiKey || !iuguAccountId) {
      console.error('Iugu API key or Account ID not found for environment:', appEnv);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Configuração da API da Iugu não encontrada' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: TransactionPayload = await req.json();
    console.log('Processing transaction for product:', payload.product_id);

    // Validate required fields
    if (!payload.product_id || !payload.buyer_email || !payload.payment_method_selected) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Campos obrigatórios não informados' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get product data
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', payload.product_id)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      console.error('Product not found or inactive:', productError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Produto não encontrado ou inativo' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate fees
    const amountTotalCents = product.price_cents;
    const platformFeeCents = Math.round(amountTotalCents * platformFeePercentage);
    const producerShareCents = amountTotalCents - platformFeeCents;

    // Validate installments
    const installments = payload.installments || 1;
    if (installments > product.max_installments_allowed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Número máximo de parcelas permitidas: ${product.max_installments_allowed}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create initial sale record
    const { data: sale, error: saleError } = await supabase
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

    if (saleError || !sale) {
      console.error('Failed to create sale record:', saleError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Erro ao criar registro de venda' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Sale record created:', sale.id);

    // Basic Auth header for Iugu
    const authHeader = `Basic ${btoa(iuguApiKey + ':')}`;

    // Prepare items for Iugu
    const items = [{
      description: product.name,
      quantity: 1,
      price_cents: product.price_cents
    }];

    let iuguResponse;
    let updateData: any = {};

    // Payment method specific logic
    if (payload.payment_method_selected === 'credit_card' && payload.card_token) {
      // Try direct charge first
      console.log('Attempting direct charge with card token');
      
      const chargePayload = {
        token: payload.card_token,
        email: payload.buyer_email,
        items: items,
        months: installments,
        ...(payload.iugu_customer_id && { customer_id: payload.iugu_customer_id })
      };

      try {
        const chargeResponse = await fetch('https://api.iugu.com/v1/charge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(chargePayload),
        });

        const chargeData = await chargeResponse.json();
        console.log('Charge response:', chargeData);

        if (chargeResponse.ok && chargeData.success) {
          // Direct charge successful
          updateData = {
            iugu_charge_id: chargeData.invoice_id,
            status: chargeData.status === 'paid' ? 'paid' : 'authorized',
            paid_at: chargeData.status === 'paid' ? new Date().toISOString() : null
          };

          iuguResponse = chargeData;
        } else {
          // Direct charge failed, fallback to invoice
          console.log('Direct charge failed, falling back to invoice:', chargeData);
          updateData.error_message_iugu = chargeData.errors ? JSON.stringify(chargeData.errors) : 'Falha na cobrança direta';
          
          // Continue to invoice creation below
        }
      } catch (error) {
        console.error('Error in direct charge:', error);
        updateData.error_message_internal = 'Erro na tentativa de cobrança direta';
      }
    }

    // If direct charge wasn't successful or wasn't attempted, create invoice
    if (!iuguResponse || !iuguResponse.success) {
      console.log('Creating invoice for payment method:', payload.payment_method_selected);
      
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

      try {
        const invoiceResponse = await fetch('https://api.iugu.com/v1/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(invoicePayload),
        });

        const invoiceData = await invoiceResponse.json();
        console.log('Invoice response status:', invoiceResponse.status);

        if (invoiceResponse.ok && invoiceData.id) {
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
          console.error('Invoice creation failed:', invoiceData);
          updateData.error_message_iugu = invoiceData.errors ? JSON.stringify(invoiceData.errors) : 'Falha na criação da fatura';
          updateData.status = 'failed';
        }
      } catch (error) {
        console.error('Error creating invoice:', error);
        updateData.error_message_internal = 'Erro na criação da fatura';
        updateData.status = 'failed';
      }
    }

    // Update sale record with Iugu response
    const { error: updateError } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', sale.id);

    if (updateError) {
      console.error('Failed to update sale record:', updateError);
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

      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          sale_id: sale.id,
          message: 'Falha no processamento do pagamento',
          iugu_errors: updateData.error_message_iugu,
          internal_errors: updateData.error_message_internal
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in create-iugu-transaction:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro interno do servidor', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
