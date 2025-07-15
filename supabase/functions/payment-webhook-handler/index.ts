import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IuguWebhookPayload {
  event: string;
  data: {
    id: string;
    status: string;
    [key: string]: any;
  };
}

interface AsaasWebhookPayload {
  event: string;
  payment: {
    id: string;
    status: string;
    [key: string]: any;
  };
}

interface SaleRecord {
  id: string;
  product_id: string;
  amount_total_cents: number;
  installments_chosen: number;
  payment_method_used: string;
  product: {
    producer_id: string;
  };
}

interface FinalSettings {
  pix_fee_percent: number;
  boleto_fee_percent: number;
  card_installments_fees: { [key: string]: number };
  pix_release_days: number;
  boleto_release_days: number;
  card_release_days: number;
  security_reserve_percent: number;
  fixed_fee_cents: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const payload = await req.json();

    console.log('[WEBHOOK_RECEIVED] Payload recebido:', JSON.stringify(payload, null, 2));

    let event: string;
    let gatewayTransactionId: string;
    let gatewayIdentifier: string;
    let paymentStatus: string;

    // --- ETAPA DE DETECÇÃO E ROTEAMENTO ---
    if (payload.event && payload.payment) { // Formato do Asaas
      gatewayIdentifier = 'asaas';
      event = payload.event;
      gatewayTransactionId = payload.payment.id;
      paymentStatus = payload.payment.status;
      console.log(`[ROUTING] Webhook do Asaas detectado. Evento: ${event}, ID da Transação: ${gatewayTransactionId}, Status: ${paymentStatus}`);
    } else if (payload.event && payload.data?.id) { // Formato da Iugu
      gatewayIdentifier = 'iugu';
      event = payload.event;
      gatewayTransactionId = payload.data.id;
      paymentStatus = payload.data.status;
      console.log(`[ROUTING] Webhook da Iugu detectado. Evento: ${event}, ID da Transação: ${gatewayTransactionId}, Status: ${paymentStatus}`);
    } else {
      throw new Error("Formato de webhook desconhecido ou inválido.");
    }
    
    // --- LÓGICA DE PROCESSAMENTO DO PAGAMENTO ---
    // Apenas processamos se for um evento de pagamento confirmado
    const isPaymentConfirmed = (gatewayIdentifier === 'asaas' && (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED')) ||
                              (gatewayIdentifier === 'iugu' && event === 'invoice.status_changed' && paymentStatus === 'paid');

    if (isPaymentConfirmed) {
        console.log(`[PAYMENT_CONFIRMED] Evento de pagamento confirmado recebido do ${gatewayIdentifier}.`);

        // Busca a nossa venda interna usando o ID da transação do gateway
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .select('*, product:products(producer_id)')
            .eq('gateway_transaction_id', gatewayTransactionId)
            .single();

        if (saleError || !sale) {
            console.error(`[SALE_NOT_FOUND] Venda com gateway_transaction_id ${gatewayTransactionId} não encontrada:`, saleError);
            throw new Error(`Venda com gateway_transaction_id ${gatewayTransactionId} não encontrada.`);
        }

        // Idempotência: não processar se já estiver paga
        if (sale.status === 'paid') {
            console.log(`[IDEMPOTENCY_CHECK] Venda ${sale.id} já está como 'paid'. Ignorando webhook.`);
            return new Response(JSON.stringify({ success: true, message: 'Webhook ignorado (venda já paga)' }), { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Buscar configurações financeiras
        const settings = await getFinancialSettings(supabase, sale.product.producer_id);
        
        // Calcular taxas
        const platformFeeAmount = calculatePlatformFee(settings, sale.payment_method_used, sale.installments_chosen, sale.amount_total_cents);
        const producerShareAmount = sale.amount_total_cents - platformFeeAmount;
        
        // Calcular data de liberação
        const releaseDate = calculateReleaseDate(settings, sale.payment_method_used);
        
        // Calcular reserva de segurança
        const securityReserveAmount = Math.round(producerShareAmount * (settings.security_reserve_percent / 100));

        const updatePayload = {
            status: 'paid',
            paid_at: new Date().toISOString(),
            payout_status: 'pending',
            release_date: releaseDate,
            platform_fee_cents: platformFeeAmount,
            producer_share_cents: producerShareAmount,
            security_reserve_cents: securityReserveAmount,
            gateway_status: paymentStatus
        };
        
        const { error: updateError } = await supabase
            .from('sales')
            .update(updatePayload)
            .eq('id', sale.id);

        if (updateError) {
            console.error(`[UPDATE_ERROR] Falha ao atualizar a venda ${sale.id}:`, updateError);
            throw new Error(`Falha ao atualizar a venda ${sale.id}: ${updateError.message}`);
        }
        
        console.log(`[SALE_UPDATED] Venda ${sale.id} atualizada para o status 'paid'.`);
        
        // Atualizar saldo do produtor
        await supabase.rpc('upsert_producer_balance', {
            p_producer_id: sale.product.producer_id,
            amount_to_add: producerShareAmount
        });
        
        console.log(`[PRODUCER_BALANCE_UPDATED] Saldo do produtor ${sale.product.producer_id} atualizado com +${producerShareAmount} centavos.`);
    } else {
        console.log(`[EVENT_IGNORED] Evento "${event}" do ${gatewayIdentifier} não requer ação.`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Webhook processado com sucesso' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CRITICAL_ERROR] Erro ao processar webhook:', error.message);
    return new Response(JSON.stringify({ success: false, message: error.message }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// --- FUNÇÕES AUXILIARES ---

async function getFinancialSettings(supabase: any, producerId: string): Promise<FinalSettings> {
  console.log(`[FINANCIAL_SETTINGS] Buscando configurações para o produtor ${producerId}...`);
  
  // Buscar configurações específicas do produtor
  const { data: producerSettings } = await supabase
    .from('producer_settings')
    .select('*')
    .eq('producer_id', producerId)
    .single();
  
  // Buscar configurações padrão da plataforma
  const { data: platformSettings } = await supabase
    .from('platform_settings')
    .select('*')
    .single();

  if (!platformSettings) {
    throw new Error('Configurações da plataforma não encontradas');
  }

  // Priorizar configurações do produtor, depois da plataforma
  return {
    pix_fee_percent: producerSettings?.custom_fees_json?.pix_fee_percent ?? platformSettings.default_pix_fee_percent ?? 5.0,
    boleto_fee_percent: producerSettings?.custom_fees_json?.boleto_fee_percent ?? platformSettings.default_boleto_fee_percent ?? 5.0,
    card_installments_fees: producerSettings?.custom_fees_json?.card_installments_fees ?? platformSettings.default_card_installments_fees ?? {
      "1": 5.0, "2": 6.85, "3": 8.70, "4": 10.55, "5": 12.40, "6": 14.25
    },
    pix_release_days: producerSettings?.custom_release_rules_json?.pix_release_days ?? platformSettings.default_pix_release_days ?? 2,
    boleto_release_days: producerSettings?.custom_release_rules_json?.boleto_release_days ?? platformSettings.default_boleto_release_days ?? 2,
    card_release_days: producerSettings?.custom_release_rules_json?.card_release_days ?? platformSettings.default_card_release_days ?? 15,
    security_reserve_percent: producerSettings?.custom_fees_json?.security_reserve_percent ?? platformSettings.default_security_reserve_percent ?? 5.0,
    fixed_fee_cents: producerSettings?.custom_fixed_fee_cents ?? platformSettings.default_fixed_fee_cents ?? 100
  };
}

function calculatePlatformFee(settings: FinalSettings, paymentMethod: string, installments: number, amountCents: number): number {
  let feePercent: number;
  
  if (paymentMethod === 'pix') {
    feePercent = settings.pix_fee_percent;
  } else if (paymentMethod === 'bank_slip') {
    feePercent = settings.boleto_fee_percent;
  } else if (paymentMethod === 'credit_card') {
    feePercent = settings.card_installments_fees[installments.toString()] || settings.card_installments_fees["1"];
  } else {
    feePercent = 5.0; // Default fallback
  }
  
  const percentageFee = Math.round(amountCents * (feePercent / 100));
  return percentageFee + settings.fixed_fee_cents;
}

function calculateReleaseDate(settings: FinalSettings, paymentMethod: string): string {
  let releaseDays: number;
  
  if (paymentMethod === 'pix') {
    releaseDays = settings.pix_release_days;
  } else if (paymentMethod === 'bank_slip') {
    releaseDays = settings.boleto_release_days;
  } else if (paymentMethod === 'credit_card') {
    releaseDays = settings.card_release_days;
  } else {
    releaseDays = 15; // Default fallback
  }
  
  const releaseDate = new Date();
  releaseDate.setDate(releaseDate.getDate() + releaseDays);
  return releaseDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}