
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransactionPayload {
  product_id: string;
  buyer_email: string;
  iugu_customer_id?: string;
  buyer_profile_id?: string;
  payment_method_selected: 'credit_card' | 'pix' | 'bank_slip';
  card_token?: string;
  installments?: number;
  buyer_name?: string;
  buyer_cpf_cnpj?: string;
  notification_url_base?: string;
}

// Função para atualizar o saldo do produtor
async function updateProducerFinancials(supabase: any, producerId: string, producerShareCents: number) {
  console.log('[DEBUG] *** ATUALIZANDO SALDO DO PRODUTOR ***:', { producerId, producerShareCents });
  
  try {
    // Buscar saldo atual do produtor
    const { data: currentFinancials, error: fetchError } = await supabase
      .from('producer_financials')
      .select('available_balance_cents, pending_balance_cents')
      .eq('producer_id', producerId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[ERRO] Erro ao buscar saldo atual do produtor:', fetchError);
      return;
    }

    const currentAvailableBalance = currentFinancials?.available_balance_cents || 0;
    const currentPendingBalance = currentFinancials?.pending_balance_cents || 0;
    const newAvailableBalance = currentAvailableBalance + producerShareCents;

    if (currentFinancials) {
      // Atualizar saldo existente
      const { error: updateError } = await supabase
        .from('producer_financials')
        .update({
          available_balance_cents: newAvailableBalance,
          updated_at: new Date().toISOString()
        })
        .eq('producer_id', producerId);

      if (updateError) {
        console.error('[ERRO] Erro ao atualizar saldo do produtor:', updateError);
      } else {
        console.log('[DEBUG] *** SALDO DO PRODUTOR ATUALIZADO ***:', { 
          producerId, 
          oldBalance: currentAvailableBalance, 
          newBalance: newAvailableBalance 
        });
      }
    } else {
      // Criar registro inicial
      const { error: insertError } = await supabase
        .from('producer_financials')
        .insert({
          producer_id: producerId,
          available_balance_cents: producerShareCents,
          pending_balance_cents: 0
        });

      if (insertError) {
        console.error('[ERRO] Erro ao criar saldo inicial do produtor:', insertError);
      } else {
        console.log('[DEBUG] *** SALDO INICIAL DO PRODUTOR CRIADO ***:', { producerId, balance: producerShareCents });
      }
    }
  } catch (error) {
    console.error('[ERRO] Erro geral ao atualizar saldo do produtor:', error);
  }
}

Deno.serve(async (req) => {
  console.log('[DEBUG] *** INÍCIO DA FUNÇÃO create-iugu-transaction ***');
  console.log('[DEBUG] Método da requisição:', req.method);
  console.log('[DEBUG] URL da requisição:', req.url);
  console.log('[DEBUG] Headers da requisição:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[DEBUG] *** INICIANDO PROCESSAMENTO PRINCIPAL DA TRANSAÇÃO ***');

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

    console.log('[DEBUG] Iugu API Key:', iuguApiKey ? 'PRESENTE (length: ' + iuguApiKey.length + ')' : 'AUSENTE');
    console.log('[DEBUG] Iugu Account ID:', iuguAccountId ? 'PRESENTE' : 'AUSENTE');
    console.log('[DEBUG] Platform fee percentage:', platformFeePercentage);

    if (!iuguApiKey || !iuguAccountId) {
      const errorMsg = 'Configuração da API da Iugu não encontrada para ambiente: ' + appEnv;
      console.error('[ERRO] *** CRITICAL ERROR ***:', errorMsg);
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
    
    console.log('[DEBUG] SUPABASE_URL:', supabaseUrl ? 'PRESENTE' : 'AUSENTE');
    console.log('[DEBUG] SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'PRESENTE' : 'AUSENTE');

    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = 'Variáveis de ambiente do Supabase não encontradas';
      console.error('[ERRO] *** CRITICAL ERROR ***:', errorMsg);
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
    console.log('[DEBUG] Cliente Supabase inicializado com sucesso');

    // Parse request body
    console.log('[DEBUG] *** TENTANDO FAZER PARSE DO BODY ***');
    let payload: TransactionPayload;
    
    try {
      const requestText = await req.text();
      console.log('[DEBUG] Body bruto recebido (length: ' + requestText.length + '):', requestText);
      payload = JSON.parse(requestText);
      console.log('[DEBUG] Payload parseado com sucesso:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      const errorMsg = 'Erro ao fazer parse do JSON da requisição';
      console.error('[ERRO] *** PARSE ERROR ***:', errorMsg, parseError);
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

    console.log('[DEBUG] *** PROCESSANDO TRANSAÇÃO PARA PRODUTO ***:', payload.product_id);
    console.log('[DEBUG] *** BUYER_PROFILE_ID RECEBIDO NO PAYLOAD ***:', payload.buyer_profile_id);

    // Validate required fields
    if (!payload.product_id || !payload.buyer_email || !payload.payment_method_selected) {
      const errorMsg = 'Campos obrigatórios não informados';
      console.error('[ERRO] *** VALIDATION ERROR ***:', errorMsg, { 
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

    console.log('[DEBUG] *** VALIDAÇÃO DO PAYLOAD PASSOU ***');

    // Get product data
    console.log('[DEBUG] *** BUSCANDO DADOS DO PRODUTO ***:', payload.product_id);
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
        console.error('[ERRO] *** PRODUTO NÃO ENCONTRADO ***:', productError);
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
      console.log('[DEBUG] *** PRODUTO ENCONTRADO ***:', JSON.stringify(product, null, 2));
    } catch (dbError) {
      console.error('[ERRO] *** ERRO AO BUSCAR PRODUTO NO BANCO ***:', dbError);
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

    console.log('[DEBUG] *** CÁLCULOS DE VALORES ***:', {
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
      console.error('[ERRO] *** INSTALLMENTS ERROR ***:', errorMsg);
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

    // Create initial sale record with buyer_profile_id
    console.log('[DEBUG] *** CRIANDO REGISTRO DE VENDA INICIAL ***');
    console.log('[DEBUG] *** GARANTINDO INCLUSÃO EXPLÍCITA DO BUYER_PROFILE_ID ***:', payload.buyer_profile_id);
    let sale;
    
    try {
      const saleToInsert = {
        product_id: payload.product_id,
        buyer_email: payload.buyer_email,
        buyer_profile_id: payload.buyer_profile_id || null, // EXPLICITAMENTE MAPEAR
        amount_total_cents: amountTotalCents,
        platform_fee_cents: platformFeeCents,
        producer_share_cents: producerShareCents,
        payment_method_used: payload.payment_method_selected,
        installments_chosen: installments,
        status: 'pending'
      };

      console.log('[DEBUG] *** OBJETO EXATO PARA INSERT DA VENDA (COM BUYER_PROFILE_ID EXPLÍCITO) ***:', JSON.stringify(saleToInsert, null, 2));

      const { data, error: saleError } = await supabase
        .from('sales')
        .insert(saleToInsert)
        .select()
        .single();

      console.log('[DEBUG] Resultado da criação da venda:', { data, saleError });

      if (saleError || !data) {
        console.error('[ERRO] *** FALHA AO CRIAR REGISTRO DE VENDA ***:', saleError);
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
      console.log('[DEBUG] *** REGISTRO DE VENDA CRIADO COM ID ***:', sale.id);
      console.log('[DEBUG] *** BUYER_PROFILE_ID SALVO NA VENDA ***:', sale.buyer_profile_id);
    } catch (dbError) {
      console.error('[ERRO] *** ERRO AO CRIAR VENDA NO BANCO ***:', dbError);
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
    console.log('[DEBUG] Header de autenticação criado (primeiros 30 chars):', authHeader.substring(0, 30) + '...');

    // Prepare items for Iugu
    const items = [{
      description: product.name,
      quantity: 1,
      price_cents: product.price_cents
    }];
    console.log('[DEBUG] *** ITEMS PARA IUGU ***:', JSON.stringify(items, null, 2));

    let iuguResponse;
    let updateData: any = {};

    console.log('[DEBUG] *** MÉTODO DE PAGAMENTO SELECIONADO ***:', payload.payment_method_selected);

    // Payment method specific logic
    if (payload.payment_method_selected === 'credit_card' && payload.card_token) {
      console.log('[DEBUG] *** TENTANDO COBRANÇA DIRETA COM TOKEN DO CARTÃO ***');
      
      const chargePayload = {
        token: payload.card_token,
        email: payload.buyer_email,
        items: items,
        months: installments,
        ...(payload.iugu_customer_id && { customer_id: payload.iugu_customer_id })
      };

      console.log('[DEBUG] Payload para cobrança direta:', JSON.stringify(chargePayload, null, 2));

      try {
        console.log('[DEBUG] Chamando fetch para https://api.iugu.com/v1/charge');
        const chargeResponse = await fetch('https://api.iugu.com/v1/charge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(chargePayload),
        });

        console.log('[DEBUG] *** RESPOSTA DA COBRANÇA DIRETA ***');
        console.log('[DEBUG] Status da resposta de cobrança:', chargeResponse.status);
        
        const chargeText = await chargeResponse.text();
        console.log('[DEBUG] Resposta bruta da cobrança (length: ' + chargeText.length + '):', chargeText);
        
        const chargeData = JSON.parse(chargeText);
        console.log('[DEBUG] *** DADOS DA COBRANÇA PARSEADOS ***:', JSON.stringify(chargeData, null, 2));

        if (chargeResponse.ok && chargeData.success) {
          console.log('[DEBUG] *** COBRANÇA DIRETA BEM-SUCEDIDA ***');
          
          // Verificar se o status indica pagamento autorizado/capturado
          const iuguStatus = chargeData.status;
          const isPaid = iuguStatus === 'authorized' || iuguStatus === 'captured' || iuguStatus === 'paid';
          
          console.log('[DEBUG] *** STATUS DA COBRANÇA ***:', { iuguStatus, isPaid });

          // Direct charge successful
          updateData = {
            iugu_charge_id: chargeData.invoice_id,
            status: isPaid ? 'paid' : chargeData.status,
            paid_at: isPaid ? new Date().toISOString() : null
          };

          // Se o pagamento foi autorizado/capturado, atualizar saldo do produtor imediatamente
          if (isPaid) {
            console.log('[DEBUG] *** PAGAMENTO AUTORIZADO/CAPTURADO - ATUALIZANDO SALDO DO PRODUTOR ***');
            await updateProducerFinancials(supabase, product.producer_id, producerShareCents);
          }

          iuguResponse = chargeData;
        } else {
          console.log('[DEBUG] *** COBRANÇA DIRETA FALHOU ***:', chargeData);
          // Direct charge failed, fallback to invoice
          updateData.error_message_iugu = chargeData.errors ? JSON.stringify(chargeData.errors) : 'Falha na cobrança direta';
          
          // Continue to invoice creation below
        }
      } catch (error) {
        console.error('[ERRO] *** ERRO NA COBRANÇA DIRETA ***:', error);
        updateData.error_message_internal = 'Erro na tentativa de cobrança direta';
      }
    } else {
      console.log('[DEBUG] *** MÉTODO NÃO É CARTÃO DE CRÉDITO OU SEM TOKEN ***');
    }

    // If direct charge wasn't successful or wasn't attempted, create invoice
    if (!iuguResponse || !iuguResponse.success) {
      console.log('[DEBUG] *** CRIANDO FATURA PARA MÉTODO DE PAGAMENTO ***:', payload.payment_method_selected);
      
      // Calculate due date
      let dueDate = new Date();
      if (payload.payment_method_selected === 'pix') {
        dueDate.setDate(dueDate.getDate() + 1); // D+1 for PIX
      } else if (payload.payment_method_selected === 'bank_slip') {
        dueDate.setDate(dueDate.getDate() + 3); // D+3 for bank slip
      } else {
        dueDate.setDate(dueDate.getDate() + 1); // D+1 for credit card invoice
      }

      // Construct the correct notification URL for our webhook handler
      const webhookUrl = `https://huakzwguwjulxhvcztuh.supabase.co/functions/v1/iugu-webhook-handler?sale_id=${sale.id}`;
      console.log('[DEBUG] *** URL DO WEBHOOK CONFIGURADA ***:', webhookUrl);

      const invoicePayload: any = {
        email: payload.buyer_email,
        due_date: dueDate.toISOString().split('T')[0], // YYYY-MM-DD format
        items: items,
        payable_with: payload.payment_method_selected,
        notification_url: webhookUrl,
        ...(payload.iugu_customer_id && { customer_id: payload.iugu_customer_id })
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

      console.log('[DEBUG] *** PAYLOAD PARA CRIAR FATURA ***:', JSON.stringify(invoicePayload, null, 2));

      try {
        console.log('[DEBUG] Chamando fetch para https://api.iugu.com/v1/invoices');
        const invoiceResponse = await fetch('https://api.iugu.com/v1/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(invoicePayload),
        });

        console.log('[DEBUG] *** RESPOSTA DA FATURA ***');
        console.log('[DEBUG] Status da resposta da fatura:', invoiceResponse.status);
        
        const invoiceText = await invoiceResponse.text();
        console.log('[DEBUG] Resposta bruta da fatura (length: ' + invoiceText.length + '):', invoiceText);
        
        const invoiceData = JSON.parse(invoiceText);
        console.log('[DEBUG] *** DADOS DA FATURA PARSEADOS ***:', JSON.stringify(invoiceData, null, 2));

        if (invoiceResponse.ok && invoiceData.id) {
          console.log('[DEBUG] *** FATURA CRIADA COM SUCESSO ***:', invoiceData.id);
          
          // EXTRAIR CAMPOS PIX/BOLETO DA RESPOSTA DA IUGU COM LÓGICA CORRIGIDA
          console.log('[DEBUG] *** INICIANDO EXTRAÇÃO CORRIGIDA DOS CAMPOS PIX/BOLETO ***');
          
          // Extract PIX fields - Múltiplas tentativas baseadas na documentação Iugu
          let pixQrCodeBase64 = null;
          let pixQrCodeText = null;
          
          // Tentativa 1: Verificar se existem campos diretos na resposta principal
          if (invoiceData.pix_qr_code_base64) {
            pixQrCodeBase64 = invoiceData.pix_qr_code_base64;
            console.log('[DEBUG] PIX QR Code Base64 encontrado no campo direto pix_qr_code_base64');
          } else if (invoiceData.qr_code_base64) {
            pixQrCodeBase64 = invoiceData.qr_code_base64;
            console.log('[DEBUG] PIX QR Code Base64 encontrado no campo direto qr_code_base64');
          }

          if (invoiceData.pix_qr_code_text) {
            pixQrCodeText = invoiceData.pix_qr_code_text;
            console.log('[DEBUG] PIX QR Code Text encontrado no campo direto pix_qr_code_text');
          } else if (invoiceData.qr_code_text) {
            pixQrCodeText = invoiceData.qr_code_text;
            console.log('[DEBUG] PIX QR Code Text encontrado no campo direto qr_code_text');
          }
          
          // Tentativa 2: Verificar objeto 'pix' na resposta
          if (invoiceData.pix && typeof invoiceData.pix === 'object') {
            console.log('[DEBUG] Objeto PIX encontrado na resposta:', invoiceData.pix);
            
            // Se pix é um array
            if (Array.isArray(invoiceData.pix) && invoiceData.pix.length > 0) {
              const pixData = invoiceData.pix[0];
              if (!pixQrCodeBase64) {
                pixQrCodeBase64 = pixData.qr_code_base64 || pixData.qrcode_base64 || pixData.base64;
              }
              if (!pixQrCodeText) {
                pixQrCodeText = pixData.qr_code_text || pixData.qrcode_text || pixData.emv || pixData.code;
              }
            } else {
              // Se pix é um objeto simples
              if (!pixQrCodeBase64) {
                pixQrCodeBase64 = invoiceData.pix.qr_code_base64 || invoiceData.pix.qrcode_base64 || invoiceData.pix.base64;
              }
              if (!pixQrCodeText) {
                pixQrCodeText = invoiceData.pix.qr_code_text || invoiceData.pix.qrcode_text || invoiceData.pix.emv || invoiceData.pix.code;
              }
            }
          }

          // Tentativa 3: Buscar QR Code através de URL (se necessário)
          if (!pixQrCodeBase64 && invoiceData.pix && invoiceData.pix.qrcode && invoiceData.pix.qrcode.startsWith('http')) {
            console.log('[DEBUG] Tentando buscar QR Code Base64 através da URL:', invoiceData.pix.qrcode);
            try {
              const qrCodeResponse = await fetch(invoiceData.pix.qrcode);
              if (qrCodeResponse.ok) {
                const qrCodeArrayBuffer = await qrCodeResponse.arrayBuffer();
                const qrCodeBase64String = btoa(String.fromCharCode(...new Uint8Array(qrCodeArrayBuffer)));
                pixQrCodeBase64 = qrCodeBase64String;
                console.log('[DEBUG] QR Code Base64 obtido via fetch da URL com sucesso');
              }
            } catch (fetchError) {
              console.error('[ERRO] Erro ao buscar QR Code da URL:', fetchError);
            }
          }

          // Extract bank slip fields
          let bankSlipBarcode = null;
          
          // Tentativa 1: Campos diretos
          if (invoiceData.bank_slip_barcode) {
            bankSlipBarcode = invoiceData.bank_slip_barcode;
            console.log('[DEBUG] Bank slip barcode encontrado no campo direto bank_slip_barcode');
          } else if (invoiceData.digitable_line) {
            bankSlipBarcode = invoiceData.digitable_line;
            console.log('[DEBUG] Bank slip barcode encontrado no campo direto digitable_line');
          }
          
          // Tentativa 2: Objeto bank_slip
          if (!bankSlipBarcode && invoiceData.bank_slip && typeof invoiceData.bank_slip === 'object') {
            console.log('[DEBUG] Objeto bank_slip encontrado na resposta:', invoiceData.bank_slip);
            bankSlipBarcode = invoiceData.bank_slip.barcode || 
                            invoiceData.bank_slip.digitable_line || 
                            invoiceData.bank_slip.digitavel_line ||
                            invoiceData.bank_slip.barcode_data;
          }
          
          // Log dos valores finais extraídos
          console.log('[DEBUG] *** VALORES FINAIS EXTRAÍDOS APÓS CORREÇÃO ***:', {
            pixQrCodeBase64: pixQrCodeBase64 ? `PRESENTE (tipo: ${typeof pixQrCodeBase64}, length: ${pixQrCodeBase64.length})` : 'NULO',
            pixQrCodeText: pixQrCodeText ? `PRESENTE (length: ${pixQrCodeText.length}, começa com: ${pixQrCodeText.substring(0, 20)}...)` : 'NULO',
            bankSlipBarcode: bankSlipBarcode ? `PRESENTE (length: ${bankSlipBarcode.length})` : 'NULO'
          });

          // Validação adicional para PIX QR Code Text - deve começar com "0002" para ser código copia e cola válido
          if (pixQrCodeText && !pixQrCodeText.startsWith('0002') && !pixQrCodeText.startsWith('00020')) {
            console.log('[DEBUG] *** ATENÇÃO: PIX QR Code Text não parece ser código copia e cola válido (não começa com 0002) ***');
            console.log('[DEBUG] Valor atual:', pixQrCodeText.substring(0, 100));
            // Se for um URL, vamos marcar como nulo para que não seja salvo incorretamente
            if (pixQrCodeText.startsWith('http')) {
              console.log('[DEBUG] PIX QR Code Text é um URL, marcando como nulo');
              pixQrCodeText = null;
            }
          }
          
          // Invoice created successfully - MONTAR OBJETO DE UPDATE COM OS CAMPOS CORRIGIDOS
          updateData = {
            ...updateData,
            iugu_invoice_id: invoiceData.id,
            status: 'pending',
            iugu_invoice_secure_url: invoiceData.secure_url,
            // CAMPOS PIX EXTRAÍDOS COM LÓGICA CORRIGIDA
            iugu_pix_qr_code_text: pixQrCodeText,
            iugu_pix_qr_code_base64: pixQrCodeBase64,
            // CAMPO BOLETO EXTRAÍDO
            iugu_bank_slip_barcode: bankSlipBarcode
          };

          console.log('[DEBUG] *** OBJETO FINAL PARA UPDATE COM CAMPOS PIX/BOLETO CORRIGIDOS ***:', JSON.stringify(updateData, null, 2));

          iuguResponse = invoiceData;
        } else {
          console.error('[ERRO] *** CRIAÇÃO DE FATURA FALHOU ***:', invoiceData);
          updateData.error_message_iugu = invoiceData.errors ? JSON.stringify(invoiceData.errors) : 'Falha na criação da fatura';
          updateData.status = 'failed';
        }
      } catch (error) {
        console.error('[ERRO] *** ERRO AO CRIAR FATURA ***:', error);
        updateData.error_message_internal = 'Erro na criação da fatura';
        updateData.status = 'failed';
      }
    }

    // Update sale record with Iugu response
    console.log('[DEBUG] *** ATUALIZANDO REGISTRO DE VENDA COM DADOS DA IUGU ***:', JSON.stringify(updateData, null, 2));
    
    try {
      const { error: updateError } = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', sale.id);

      if (updateError) {
        console.error('[ERRO] Falha ao atualizar registro de venda:', updateError);
      } else {
        console.log('[DEBUG] *** REGISTRO DE VENDA ATUALIZADO COM SUCESSO ***');
        
        // Verificar se o update realmente salvou os campos importantes
        const { data: updatedSale, error: verifyError } = await supabase
          .from('sales')
          .select('iugu_pix_qr_code_base64, iugu_pix_qr_code_text, iugu_bank_slip_barcode, buyer_profile_id')
          .eq('id', sale.id)
          .single();
          
        console.log('[DEBUG] *** VERIFICAÇÃO PÓS-UPDATE DOS CAMPOS IMPORTANTES (PÓS-CORREÇÃO) ***:', {
          verifyError,
          updatedSale: {
            buyer_profile_id: updatedSale?.buyer_profile_id,
            iugu_pix_qr_code_base64: updatedSale?.iugu_pix_qr_code_base64 ? `PRESENTE (length: ${updatedSale.iugu_pix_qr_code_base64.length})` : 'NULO',
            iugu_pix_qr_code_text: updatedSale?.iugu_pix_qr_code_text ? `PRESENTE (length: ${updatedSale.iugu_pix_qr_code_text.length}, começa com: ${updatedSale.iugu_pix_qr_code_text.substring(0, 20)}...)` : 'NULO',
            iugu_bank_slip_barcode: updatedSale?.iugu_bank_slip_barcode ? `PRESENTE (length: ${updatedSale.iugu_bank_slip_barcode.length})` : 'NULO'
          }
        });
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

      console.log('[DEBUG] *** RETORNANDO RESPOSTA DE SUCESSO COM CAMPOS CORRIGIDOS ***:', JSON.stringify(responseData, null, 2));
      return new Response(
        JSON.stringify(responseData),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
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
      console.log('[DEBUG] *** RETORNANDO RESPOSTA DE ERRO ***:', JSON.stringify(errorResponse, null, 2));
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('[ERRO] *** ERRO GERAL NA create-iugu-transaction ***:', error.message);
    console.error('[ERRO] Stack trace:', error.stack);
    console.error('[ERRO] Erro completo:', error);
    
    const errorResponse = {
      success: false, 
      error: true,
      message: 'Erro interno do servidor', 
      details: error.message,
      functionName: 'create-iugu-transaction'
    };
    console.log('[DEBUG] *** RETORNANDO ERRO GERAL ***:', JSON.stringify(errorResponse, null, 2));
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
