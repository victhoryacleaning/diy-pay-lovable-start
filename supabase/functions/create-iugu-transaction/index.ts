
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
  donation_amount_cents?: number; // Campo para doações
  quantity?: number; // Para eventos
  attendees?: Array<{ name: string; email: string }>; // Para eventos
}

// Função para gerar UUID v4
function generateUUID(): string {
  return crypto.randomUUID();
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

// Função para buscar dados PIX via API adicional da Iugu se necessário
async function fetchPixDataFromIugu(invoiceId: string, authHeader: string): Promise<{ base64?: string, text?: string }> {
  try {
    console.log('[DEBUG] *** BUSCANDO DADOS PIX ADICIONAIS VIA API IUGU ***:', invoiceId);
    
    // Buscar detalhes completos da fatura
    const detailResponse = await fetch(`https://api.iugu.com/v1/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (detailResponse.ok) {
      const detailData = await detailResponse.json();
      console.log('[DEBUG] Dados detalhados da fatura:', JSON.stringify(detailData, null, 2));

      let pixQrCodeBase64 = null;
      let pixQrCodeText = null;

      // Tentar extrair Base64 do QR Code
      if (detailData.pix?.qrcode && !detailData.pix.qrcode.startsWith('http')) {
        pixQrCodeBase64 = detailData.pix.qrcode;
      } else if (detailData.pix?.qrcode_base64) {
        pixQrCodeBase64 = detailData.pix.qrcode_base64;
      } else if (detailData.pix_qr_code_base64) {
        pixQrCodeBase64 = detailData.pix_qr_code_base64;
      }

      // Se temos uma URL do QR Code, buscar o Base64
      if (!pixQrCodeBase64 && detailData.pix?.qrcode && detailData.pix.qrcode.startsWith('http')) {
        console.log('[DEBUG] Buscando QR Code Base64 via URL:', detailData.pix.qrcode);
        try {
          const qrResponse = await fetch(detailData.pix.qrcode);
          if (qrResponse.ok) {
            const qrBuffer = await qrResponse.arrayBuffer();
            const qrBase64 = btoa(String.fromCharCode(...new Uint8Array(qrBuffer)));
            pixQrCodeBase64 = qrBase64;
            console.log('[DEBUG] QR Code Base64 obtido via fetch:', pixQrCodeBase64 ? `STRING (length: ${pixQrCodeBase64.length})` : 'NULL');
          }
        } catch (error) {
          console.error('[ERRO] Erro ao buscar QR Code via URL:', error);
        }
      }

      // Tentar extrair código PIX copia e cola
      if (detailData.pix?.qrcode_text && !detailData.pix.qrcode_text.startsWith('http')) {
        pixQrCodeText = detailData.pix.qrcode_text;
      } else if (detailData.pix?.emv) {
        pixQrCodeText = detailData.pix.emv;
      } else if (detailData.pix_qr_code_text && !detailData.pix_qr_code_text.startsWith('http')) {
        pixQrCodeText = detailData.pix_qr_code_text;
      } else if (detailData.emv) {
        pixQrCodeText = detailData.emv;
      }

      console.log('[DEBUG] Dados PIX extraídos via API adicional:', {
        base64: pixQrCodeBase64 ? `STRING (length: ${pixQrCodeBase64.length})` : 'NULL',
        text: pixQrCodeText ? `STRING (length: ${pixQrCodeText.length}, começa com: ${pixQrCodeText.substring(0, 10)}...)` : 'NULL'
      });

      return { base64: pixQrCodeBase64, text: pixQrCodeText };
    }
  } catch (error) {
    console.error('[ERRO] Erro ao buscar dados PIX adicionais:', error);
  }
  
  return {};
}

// Função para criar ou obter plano na Iugu
async function createOrGetIuguPlan(product: any, authHeader: string): Promise<{ success: boolean, plan_identifier?: string, error?: string }> {
  console.log('[DEBUG] *** CRIANDO OU OBTENDO PLANO NA IUGU ***');
  
  const planIdentifier = `plan_${product.id}`;
  
  try {
    // Primeiro, verificar se o plano já existe
    console.log('[DEBUG] Verificando se plano já existe:', planIdentifier);
    const checkResponse = await fetch(`https://api.iugu.com/v1/plans/${planIdentifier}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (checkResponse.ok) {
      console.log('[DEBUG] *** PLANO JÁ EXISTE NA IUGU ***:', planIdentifier);
      return { success: true, plan_identifier: planIdentifier };
    }

    // Se não existe, criar o plano
    console.log('[DEBUG] *** CRIANDO NOVO PLANO NA IUGU ***');
    
    // Mapear frequency para interval e interval_type
    let interval = 1;
    let intervalType = 'months';
    
    if (product.subscription_frequency === 'weekly') {
      interval = 1;
      intervalType = 'weeks';
    } else if (product.subscription_frequency === 'monthly') {
      interval = 1;
      intervalType = 'months';
    } else if (product.subscription_frequency === 'yearly') {
      interval = 1;
      intervalType = 'years';
    }

    const planPayload = {
      name: product.name,
      identifier: planIdentifier,
      interval: interval,
      interval_type: intervalType,
      prices: [
        {
          currency: 'BRL',
          value_cents: product.price_cents
        }
      ]
    };

    console.log('[DEBUG] Payload para criar plano:', JSON.stringify(planPayload, null, 2));

    const createResponse = await fetch('https://api.iugu.com/v1/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(planPayload),
    });

    const createData = await createResponse.json();
    console.log('[DEBUG] Resposta da criação do plano:', JSON.stringify(createData, null, 2));

    if (createResponse.ok && createData.identifier) {
      console.log('[DEBUG] *** PLANO CRIADO COM SUCESSO ***:', createData.identifier);
      return { success: true, plan_identifier: createData.identifier };
    } else {
      console.error('[ERRO] Falha ao criar plano:', createData);
      return { success: false, error: createData.errors ? JSON.stringify(createData.errors) : 'Erro ao criar plano' };
    }

  } catch (error) {
    console.error('[ERRO] Erro ao criar/obter plano:', error);
    return { success: false, error: error.toString() };
  }
}

// Função para adicionar método de pagamento ao cliente
async function addPaymentMethodToCustomer(customerId: string, cardToken: string, authHeader: string): Promise<{ success: boolean, payment_method_id?: string, error?: string }> {
  console.log('[DEBUG] *** ADICIONANDO MÉTODO DE PAGAMENTO AO CLIENTE ***');
  
  try {
    const paymentMethodPayload = {
      token: cardToken
    };

    console.log('[DEBUG] Payload para adicionar método de pagamento:', JSON.stringify(paymentMethodPayload, null, 2));

    const response = await fetch(`https://api.iugu.com/v1/customers/${customerId}/payment_methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(paymentMethodPayload),
    });

    const data = await response.json();
    console.log('[DEBUG] Resposta da adição do método de pagamento:', JSON.stringify(data, null, 2));

    if (response.ok && data.id) {
      console.log('[DEBUG] *** MÉTODO DE PAGAMENTO ADICIONADO COM SUCESSO ***:', data.id);
      return { success: true, payment_method_id: data.id };
    } else {
      console.error('[ERRO] Falha ao adicionar método de pagamento:', data);
      return { success: false, error: data.errors ? JSON.stringify(data.errors) : 'Erro ao adicionar método de pagamento' };
    }

  } catch (error) {
    console.error('[ERRO] Erro ao adicionar método de pagamento:', error);
    return { success: false, error: error.toString() };
  }
}

// Função para criar assinatura na Iugu
async function createIuguSubscription(customerId: string, planIdentifier: string, paymentMethodId: string, authHeader: string): Promise<{ success: boolean, subscription_id?: string, error?: string }> {
  console.log('[DEBUG] *** CRIANDO ASSINATURA NA IUGU ***');
  
  try {
    const subscriptionPayload = {
      customer_id: customerId,
      plan_identifier: planIdentifier,
      payment_method_id: paymentMethodId
    };

    console.log('[DEBUG] Payload para criar assinatura:', JSON.stringify(subscriptionPayload, null, 2));

    const response = await fetch('https://api.iugu.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(subscriptionPayload),
    });

    const data = await response.json();
    console.log('[DEBUG] Resposta da criação da assinatura:', JSON.stringify(data, null, 2));

    if (response.ok && data.id) {
      console.log('[DEBUG] *** ASSINATURA CRIADA COM SUCESSO ***:', data.id);
      return { success: true, subscription_id: data.id };
    } else {
      console.error('[ERRO] Falha ao criar assinatura:', data);
      return { success: false, error: data.errors ? JSON.stringify(data.errors) : 'Erro ao criar assinatura' };
    }

  } catch (error) {
    console.error('[ERRO] Erro ao criar assinatura:', error);
    return { success: false, error: error.toString() };
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

    // *** LOG DE DEPURAÇÃO - CORPO COMPLETO DA REQUISIÇÃO ***
    console.log('[DEBUG] *** TENTANDO FAZER PARSE DO BODY ***');
    let payload: TransactionPayload;
    
    try {
      const requestText = await req.text();
      console.log('[DEBUG] *** CORPO COMPLETO DA REQUISIÇÃO RECEBIDO ***:', requestText);
      console.log('[DEBUG] *** TAMANHO DO CORPO DA REQUISIÇÃO ***:', requestText.length, 'caracteres');
      payload = JSON.parse(requestText);
      console.log('[DEBUG] *** PAYLOAD PARSEADO COM SUCESSO ***:', JSON.stringify(payload, null, 2));
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
    console.log('[DEBUG] *** DONATION_AMOUNT_CENTS RECEBIDO ***:', payload.donation_amount_cents);
    console.log('[DEBUG] *** QUANTITY RECEBIDO (EVENTOS) ***:', payload.quantity);
    console.log('[DEBUG] *** ATTENDEES RECEBIDO (EVENTOS) ***:', payload.attendees);

    // *** VALIDAÇÃO DETALHADA DOS CAMPOS OBRIGATÓRIOS ***
    console.log('[DEBUG] *** VALIDAÇÃO DETALHADA DOS CAMPOS OBRIGATÓRIOS ***');
    console.log('[DEBUG] - product_id:', payload.product_id ? 'PRESENTE' : 'AUSENTE');
    console.log('[DEBUG] - buyer_email:', payload.buyer_email ? 'PRESENTE' : 'AUSENTE');
    console.log('[DEBUG] - payment_method_selected:', payload.payment_method_selected ? 'PRESENTE' : 'AUSENTE');
    
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

    // *** CÁLCULO DO VALOR BASEADO NO TIPO DE PRODUTO ***
    let finalAmountCents = 0;
    let finalQuantity = 1;
    let eventAttendeesData = null;

    if (product.product_type === 'donation') {
      if (payload.donation_amount_cents) {
        finalAmountCents = Number(payload.donation_amount_cents);
        console.log('[DEBUG] *** PRODUTO DE DOAÇÃO - USANDO VALOR DINÂMICO ***:', finalAmountCents);
      } else {
        console.error('[ERRO] *** PRODUTO DE DOAÇÃO SEM VALOR ESPECIFICADO ***');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: true,
            message: 'Valor da doação é obrigatório',
            functionName: 'create-iugu-transaction'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else if (product.product_type === 'event') {
      finalQuantity = payload.quantity || 1;
      finalAmountCents = product.price_cents * finalQuantity;
      
      // Processar dados dos participantes para eventos
      if (payload.attendees && Array.isArray(payload.attendees)) {
        eventAttendeesData = payload.attendees.map((attendee, index) => ({
          id: generateUUID(),
          name: attendee.name,
          email: attendee.email,
          checked_in: false,
          checked_in_at: null,
          lote: 'Primeiro Lote',
          order_index: index + 1
        }));
        console.log('[DEBUG] *** DADOS DOS PARTICIPANTES PROCESSADOS ***:', eventAttendeesData);
      }
      
      console.log('[DEBUG] *** PRODUTO EVENTO - CALCULANDO VALOR TOTAL ***:', {
        price_per_ticket: product.price_cents,
        quantity: finalQuantity,
        total: finalAmountCents
      });
    } else if (product.product_type === 'subscription') {
      // *** LÓGICA PARA ASSINATURA RECORRENTE ***
      finalAmountCents = product.price_cents;
      console.log('[DEBUG] *** PRODUTO ASSINATURA - USANDO PREÇO DO PRODUTO ***:', finalAmountCents);
      
      // Validar se é cartão de crédito (obrigatório para assinaturas)
      if (payload.payment_method_selected !== 'credit_card' || !payload.card_token) {
        console.error('[ERRO] *** ASSINATURA REQUER CARTÃO DE CRÉDITO ***');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: true,
            message: 'Assinaturas requerem pagamento por cartão de crédito',
            functionName: 'create-iugu-transaction'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      // *** LÓGICA PARA PRODUTO PADRÃO (PAGAMENTO ÚNICO) ***
      finalAmountCents = product.price_cents;
      console.log('[DEBUG] *** PRODUTO PAGAMENTO ÚNICO - USANDO PREÇO DO PRODUTO ***:', finalAmountCents);
    }

    // Validação final do valor
    if (finalAmountCents <= 0) {
      console.error('[ERRO] *** VALOR FINAL INVÁLIDO ***:', finalAmountCents);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: 'O valor final da transação não pode ser zero ou negativo',
          functionName: 'create-iugu-transaction'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const platformFeeCents = Math.round(finalAmountCents * platformFeePercentage);
    const producerShareCents = finalAmountCents - platformFeeCents;

    console.log('[DEBUG] *** CÁLCULOS DE VALORES ***:', {
      finalAmountCents,
      platformFeeCents,
      producerShareCents,
      platformFeePercentage,
      product_type: product.product_type
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

    // Create initial sale record with buyer_profile_id and event data
    console.log('[DEBUG] *** CRIANDO REGISTRO DE VENDA INICIAL ***');
    console.log('[DEBUG] *** GARANTINDO INCLUSÃO EXPLÍCITA DO BUYER_PROFILE_ID ***:', payload.buyer_profile_id);
    let sale;
    
    try {
      const saleToInsert: any = {
        product_id: payload.product_id,
        buyer_email: payload.buyer_email,
        buyer_profile_id: payload.buyer_profile_id || null,
        amount_total_cents: finalAmountCents,
        platform_fee_cents: platformFeeCents,
        producer_share_cents: producerShareCents,
        payment_method_used: payload.payment_method_selected,
        installments_chosen: installments,
        status: 'pending'
      };

      // Adicionar dados específicos para eventos
      if (product.product_type === 'event' && eventAttendeesData) {
        saleToInsert.event_attendees = eventAttendeesData;
        console.log('[DEBUG] *** ADICIONANDO DADOS DOS PARTICIPANTES DO EVENTO ***:', eventAttendeesData);
      }

      console.log('[DEBUG] *** OBJETO EXATO PARA INSERT DA VENDA ***:', JSON.stringify(saleToInsert, null, 2));

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
      console.log('[DEBUG] *** EVENT_ATTENDEES SALVO NA VENDA ***:', sale.event_attendees);
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

    // *** PROCESSAMENTO ESPECÍFICO PARA ASSINATURAS ***
    if (product.product_type === 'subscription') {
      console.log('[DEBUG] *** PROCESSANDO ASSINATURA RECORRENTE ***');
      
      try {
        // 1. Criar ou obter plano na Iugu
        const planResult = await createOrGetIuguPlan(product, authHeader);
        if (!planResult.success) {
          throw new Error(planResult.error);
        }

        // 2. Adicionar método de pagamento ao cliente
        const paymentMethodResult = await addPaymentMethodToCustomer(
          payload.iugu_customer_id!, 
          payload.card_token!, 
          authHeader
        );
        if (!paymentMethodResult.success) {
          throw new Error(paymentMethodResult.error);
        }

        // 3. Criar assinatura na Iugu
        const subscriptionResult = await createIuguSubscription(
          payload.iugu_customer_id!,
          planResult.plan_identifier!,
          paymentMethodResult.payment_method_id!,
          authHeader
        );
        if (!subscriptionResult.success) {
          throw new Error(subscriptionResult.error);
        }

        // 4. Atualizar registro de venda com os dados da assinatura
        const updateData = {
          iugu_subscription_id: subscriptionResult.subscription_id,
          status: 'active'
        };

        const { error: updateError } = await supabase
          .from('sales')
          .update(updateData)
          .eq('id', sale.id);

        if (updateError) {
          console.error('[ERRO] Falha ao atualizar venda com dados da assinatura:', updateError);
          throw new Error('Erro ao atualizar registro de venda');
        }

        console.log('[DEBUG] *** ASSINATURA CRIADA COM SUCESSO ***');

        // Retornar resposta de sucesso para assinatura
        const responseData = {
          success: true,
          sale_id: sale.id,
          subscription_id: subscriptionResult.subscription_id,
          payment_method: 'subscription',
          status: 'active'
        };

        console.log('[DEBUG] *** RETORNANDO RESPOSTA DE SUCESSO PARA ASSINATURA ***:', JSON.stringify(responseData, null, 2));
        return new Response(
          JSON.stringify(responseData),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('[ERRO] *** ERRO NO PROCESSAMENTO DA ASSINATURA ***:', error);
        
        // Atualizar venda como failed
        await supabase
          .from('sales')
          .update({ 
            status: 'failed',
            error_message_internal: error.toString()
          })
          .eq('id', sale.id);

        return new Response(
          JSON.stringify({ 
            success: false, 
            sale_id: sale.id,
            message: 'Falha no processamento da assinatura',
            error: error.toString(),
            functionName: 'create-iugu-transaction'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // *** USAR VALOR CORRETO NOS ITEMS BASEADO NO TIPO DE PRODUTO ***
    const items = [{
      description: product.product_type === 'event' && finalQuantity > 1 
        ? `${product.name} (${finalQuantity} ingressos)`
        : product.name,
      quantity: finalQuantity,
      price_cents: Math.round(finalAmountCents / finalQuantity) // Preço unitário
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
          
          // EXTRAÇÃO CORRIGIDA DOS DADOS PIX/BOLETO
          console.log('[DEBUG] *** INICIANDO EXTRAÇÃO CORRIGIDA DOS DADOS PIX/BOLETO ***');
          
          let pixQrCodeBase64 = null;
          let pixQrCodeText = null;
          let bankSlipBarcode = null;

          // Para PIX: Extrair dados da resposta da invoice
          if (payload.payment_method_selected === 'pix') {
            // 1. Tentar extrair QR Code Base64 da resposta direta
            if (invoiceData.pix?.qrcode && !invoiceData.pix.qrcode.startsWith('http')) {
              // Se qrcode não é URL, pode ser o base64 direto
              pixQrCodeBase64 = invoiceData.pix.qrcode;
              console.log('[DEBUG] QR Code Base64 extraído de pix.qrcode (direto)');
            } else if (invoiceData.pix?.qrcode_base64) {
              pixQrCodeBase64 = invoiceData.pix.qrcode_base64;
              console.log('[DEBUG] QR Code Base64 extraído de pix.qrcode_base64');
            } else if (invoiceData.pix_qr_code_base64) {
              pixQrCodeBase64 = invoiceData.pix_qr_code_base64;
              console.log('[DEBUG] QR Code Base64 extraído de pix_qr_code_base64');
            }

            // Se temos uma URL do QR Code, buscar o Base64 dela
            if (!pixQrCodeBase64 && invoiceData.pix?.qrcode && invoiceData.pix.qrcode.startsWith('http')) {
              console.log('[DEBUG] Buscando QR Code Base64 via URL:', invoiceData.pix.qrcode);
              try {
                const qrResponse = await fetch(invoiceData.pix.qrcode);
                if (qrResponse.ok) {
                  const qrBuffer = await qrResponse.arrayBuffer();
                  const qrBase64 = btoa(String.fromCharCode(...new Uint8Array(qrBuffer)));
                  pixQrCodeBase64 = qrBase64;
                  console.log('[DEBUG] QR Code Base64 obtido via fetch da URL');
                }
              } catch (error) {
                console.error('[ERRO] Erro ao buscar QR Code via URL:', error);
              }
            }

            // 2. Tentar extrair código PIX copia e cola (deve começar com "0002")
            if (invoiceData.pix?.qrcode_text && !invoiceData.pix.qrcode_text.startsWith('http') && invoiceData.pix.qrcode_text.startsWith('0002')) {
              pixQrCodeText = invoiceData.pix.qrcode_text;
              console.log('[DEBUG] Código PIX extraído de pix.qrcode_text');
            } else if (invoiceData.pix?.emv && invoiceData.pix.emv.startsWith('0002')) {
              pixQrCodeText = invoiceData.pix.emv;
              console.log('[DEBUG] Código PIX extraído de pix.emv');
            } else if (invoiceData.pix_qr_code_text && !invoiceData.pix_qr_code_text.startsWith('http') && invoiceData.pix_qr_code_text.startsWith('0002')) {
              pixQrCodeText = invoiceData.pix_qr_code_text;
              console.log('[DEBUG] Código PIX extraído de pix_qr_code_text');
            } else if (invoiceData.emv && invoiceData.emv.startsWith('0002')) {
              pixQrCodeText = invoiceData.emv;
              console.log('[DEBUG] Código PIX extraído de emv');
            }

            // Se não conseguimos extrair os dados PIX da resposta inicial, tentar API adicional
            if (!pixQrCodeBase64 || !pixQrCodeText) {
              console.log('[DEBUG] Dados PIX incompletos na resposta inicial, tentando busca adicional...');
              const additionalPixData = await fetchPixDataFromIugu(invoiceData.id, authHeader);
              
              if (!pixQrCodeBase64 && additionalPixData.base64) {
                pixQrCodeBase64 = additionalPixData.base64;
                console.log('[DEBUG] QR Code Base64 obtido via busca adicional');
              }
              
              if (!pixQrCodeText && additionalPixData.text) {
                pixQrCodeText = additionalPixData.text;
                console.log('[DEBUG] Código PIX obtido via busca adicional');
              }
            }
          }

          // Para Boleto: Extrair código de barras
          if (payload.payment_method_selected === 'bank_slip') {
            if (invoiceData.bank_slip_barcode) {
              bankSlipBarcode = invoiceData.bank_slip_barcode;
            } else if (invoiceData.digitable_line) {
              bankSlipBarcode = invoiceData.digitable_line;
            } else if (invoiceData.bank_slip?.barcode) {
              bankSlipBarcode = invoiceData.bank_slip.barcode;
            } else if (invoiceData.bank_slip?.digitable_line) {
              bankSlipBarcode = invoiceData.bank_slip.digitable_line;
            }
          }
          
          // LOG CRÍTICO DOS VALORES EXTRAÍDOS
          console.log('[DEBUG] *** VALORES FINAIS EXTRAÍDOS PARA SALVAR ***:', {
            'QR Code Base64 (imagem)': pixQrCodeBase64 ? `STRING (length: ${pixQrCodeBase64.length})` : 'NULL',
            'Código Copia e Cola (deve começar com 0002)': pixQrCodeText ? `STRING (length: ${pixQrCodeText.length}, começa com: ${pixQrCodeText.substring(0, 10)}...)` : 'NULL',
            'Bank Slip Barcode': bankSlipBarcode ? `STRING (length: ${bankSlipBarcode.length})` : 'NULL'
          });
          
          // MONTAR OBJETO DE UPDATE COM OS CAMPOS CORRIGIDOS
          updateData = {
            ...updateData,
            iugu_invoice_id: invoiceData.id,
            status: 'pending',
            iugu_invoice_secure_url: invoiceData.secure_url,
            // CAMPOS PIX/BOLETO CORRIGIDOS - salvando os valores BRUTOS
            iugu_pix_qr_code_text: pixQrCodeText,
            iugu_pix_qr_code_base64: pixQrCodeBase64,
            iugu_bank_slip_barcode: bankSlipBarcode
          };

          console.log('[DEBUG] *** OBJETO FINAL SENDO USADO PARA O UPDATE NA SALES ***:', JSON.stringify(updateData, null, 2));

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
    console.log('[DEBUG] *** EXECUTANDO UPDATE NA TABELA SALES ***');
    
    try {
      const { data: updateResult, error: updateDbError } = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', sale.id)
        .select()
        .single();

      console.log('[DEBUG] >>> CREATE_TRANSACTION: Resultado do UPDATE na sales - Data:', updateResult);
      console.log('[DEBUG] >>> CREATE_TRANSACTION: Resultado do UPDATE na sales - Error:', updateDbError);

      if (updateDbError) {
        console.error('[ERRO] Falha ao atualizar registro de venda:', updateDbError);
      } else {
        console.log('[DEBUG] *** REGISTRO DE VENDA ATUALIZADO COM SUCESSO ***');
        
        // VERIFICAÇÃO FINAL DOS CAMPOS IMPORTANTES
        console.log('[DEBUG] *** VERIFICAÇÃO FINAL DOS CAMPOS PIX APÓS UPDATE ***:', {
          sale_id: updateResult?.id,
          iugu_pix_qr_code_base64: updateResult?.iugu_pix_qr_code_base64 ? `PRESENTE (length: ${updateResult.iugu_pix_qr_code_base64.length})` : 'NULL',
          iugu_pix_qr_code_text: updateResult?.iugu_pix_qr_code_text ? `PRESENTE (length: ${updateResult.iugu_pix_qr_code_text.length}, começa com: ${updateResult.iugu_pix_qr_code_text.substring(0, 10)}...)` : 'NULL',
          iugu_bank_slip_barcode: updateResult?.iugu_bank_slip_barcode ? `PRESENTE (length: ${updateResult.iugu_bank_slip_barcode.length})` : 'NULL'
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

      console.log('[DEBUG] *** RETORNANDO RESPOSTA DE SUCESSO ***:', JSON.stringify(responseData, null, 2));
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
