
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Interfaces (Tipos de Dados) ---
interface IuguWebhookPayload {
  event: string;
  data: {
    id: string;
    status: string;
    [key: string]: any;
  };
}

interface SaleRecord {
  id: string;
  product_id: string;
  iugu_status: string;
  status: string; // Nosso status interno
  payment_method_used: string;
  installments_chosen: number;
  amount_total_cents: number;
  iugu_subscription_id: string | null;
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
}

// --- Constantes e Configurações ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Função Principal do Servidor Deno ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload: IuguWebhookPayload = await req.json();
    console.log(`[WEBHOOK_RECEIVED] Event: ${payload.event}, Invoice ID: ${payload.data.id}`);

    const { event, data: webhookData } = payload;
    const iuguInvoiceId = webhookData.id;

    // --- Buscar a Venda no Banco de Dados ---
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*, product:products(producer_id)')
      .eq('iugu_invoice_id', iuguInvoiceId)
      .single();

    if (saleError || !sale) {
      console.warn(`[SALE_NOT_FOUND] Webhook para fatura ${iuguInvoiceId} recebido, mas venda não encontrada.`);
      // Retorna 200 para a Iugu não reenviar um webhook para uma venda que não nos interessa.
      return new Response(JSON.stringify({ success: true, message: 'Webhook received but sale not found' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Processar o Evento ---
    switch (event) {
      case 'invoice.status_changed':
        await processInvoiceStatusChange(supabase, sale, webhookData);
        break;
      
      case 'invoice.refund':
        // A lógica de refund pode ser adicionada aqui no futuro, se necessário.
        console.log(`[REFUND_EVENT] Evento de reembolso recebido para a fatura ${iuguInvoiceId}.`);
        await supabase.from('sales').update({ iugu_status: 'refunded', status: 'refunded' }).eq('id', sale.id);
        break;
      
      default:
        console.log(`[UNHANDLED_EVENT] Evento não tratado: ${event}`);
        // Apenas atualiza o status da Iugu para referência, sem alterar nosso status interno.
        await supabase.from('sales').update({ iugu_status: webhookData.status }).eq('id', sale.id);
        break;
    }

    return new Response(JSON.stringify({ success: true, message: 'Webhook processed' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[CRITICAL_ERROR] Erro ao processar webhook:', error.message, error.stack);
    // Retornar 200 para a Iugu é uma prática segura para evitar loops de reenvio em caso de erros internos.
    return new Response(JSON.stringify({ success: false, message: 'Internal Server Error' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// --- Funções Auxiliares ---

/**
 * Processa a mudança de status de uma fatura.
 * Contém a lógica principal de cálculo financeiro.
 */
async function processInvoiceStatusChange(supabase: SupabaseClient, sale: SaleRecord, webhookData: IuguWebhookPayload['data']) {
  const newIuguStatus = webhookData.status;
  console.log(`[PROCESS_STATUS_CHANGE] Sale ID: ${sale.id}, New Iugu Status: ${newIuguStatus}`);

  // 1. Sempre registra o último status da Iugu para fins de auditoria.
  await supabase.from('sales').update({ iugu_status: newIuguStatus }).eq('id', sale.id);

  // 2. Lógica principal executada SOMENTE quando o pagamento é confirmado E ainda não foi processado por nós.
  if (newIuguStatus === 'paid' && sale.status !== 'paid') {
    console.log(`[PAYMENT_CONFIRMED] Processando dados financeiros para a venda ${sale.id}`);

    const producerId = sale.product?.producer_id;
    if (!producerId) {
      throw new Error(`Producer ID não encontrado para a venda ${sale.id}`);
    }

    // Buscar configurações financeiras
    const settings = await getFinancialSettings(supabase, producerId);

    // Calcular valores financeiros
    const fee = calculatePlatformFee(settings, sale.payment_method_used, sale.installments_chosen, sale.amount_total_cents);
    const releaseDate = calculateReleaseDate(settings, sale.payment_method_used);
    const producerShare = sale.amount_total_cents - fee;
    const securityReserve = Math.round(sale.amount_total_cents * (settings.security_reserve_percent / 100));

    const updatePayload = {
      status: 'paid', // Nosso status interno agora é 'paid'
      paid_at: new Date().toISOString(),
      release_date: releaseDate,
      platform_fee_cents: fee,
      producer_share_cents: producerShare,
      security_reserve_cents: securityReserve,
      payout_status: 'pending', // O dinheiro está pendente de liberação
    };

    // Atualizar o registro da venda com todos os dados financeiros
    const { error: updateError } = await supabase.from('sales').update(updatePayload).eq('id', sale.id);

    if (updateError) {
      console.error(`[DB_UPDATE_ERROR] Falha ao atualizar dados financeiros para a venda ${sale.id}:`, updateError);
      throw updateError;
    }
    console.log(`[FINANCIALS_CALCULATED] Dados financeiros para a venda ${sale.id} foram calculados e salvos.`);

  } else if (['canceled', 'expired'].includes(newIuguStatus) && sale.status !== newIuguStatus) {
    // Lida com status finais que não são 'paid'
    console.log(`[INVOICE_ENDED] Fatura ${sale.id} atualizada para o status final: ${newIuguStatus}`);
    await supabase.from('sales').update({ status: newIuguStatus }).eq('id', sale.id);
  } else {
    console.log(`[STATUS_IGNORED] Status "${newIuguStatus}" para a venda ${sale.id} ignorado (ou já processado).`);
  }
}

/**
 * Busca as configurações financeiras, priorizando as personalizadas do produtor.
 */
async function getFinancialSettings(supabase: SupabaseClient, producerId: string): Promise<FinalSettings> {
  // Tenta buscar as configurações personalizadas
  const { data: producerSettings } = await supabase
    .from('producer_settings')
    .select('*')
    .eq('producer_id', producerId)
    .single();

  // Busca as configurações padrão da plataforma
  const { data: platformSettings, error: platformError } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (platformError) {
    throw new Error('Configurações da plataforma não encontradas. A migração foi executada?');
  }

  // Combina as configurações, dando prioridade às do produtor
  return {
    pix_fee_percent: producerSettings?.custom_pix_fee_percent ?? platformSettings.default_pix_fee_percent,
    boleto_fee_percent: producerSettings?.custom_boleto_fee_percent ?? platformSettings.default_boleto_fee_percent,
    card_installments_fees: producerSettings?.custom_card_installments_fees ?? platformSettings.default_card_installments_fees,
    pix_release_days: producerSettings?.custom_pix_release_days ?? platformSettings.default_pix_release_days,
    boleto_release_days: producerSettings?.custom_boleto_release_days ?? platformSettings.default_boleto_release_days,
    card_release_days: producerSettings?.custom_card_release_days ?? platformSettings.default_card_release_days,
    security_reserve_percent: producerSettings?.custom_security_reserve_percent ?? platformSettings.default_security_reserve_percent,
  };
}

/**
 * Calcula a taxa da plataforma em centavos com base nas configurações.
 */
function calculatePlatformFee(settings: FinalSettings, paymentMethod: string, installments: number, amountCents: number): number {
  let feePercent: number;
  const method = paymentMethod.toLowerCase();

  if (method === 'pix') {
    feePercent = settings.pix_fee_percent;
  } else if (method === 'bank_slip' || method === 'boleto') {
    feePercent = settings.boleto_fee_percent;
  } else if (method === 'credit_card' || method === 'card') {
    const installmentKey = installments.toString();
    feePercent = settings.card_installments_fees[installmentKey] ?? settings.card_installments_fees["1"];
  } else {
    // Fallback seguro
    feePercent = 5.0; 
  }

  if (typeof feePercent !== 'number') {
    console.warn(`[FEE_WARNING] Taxa para ${installments} parcelas não encontrada. Usando taxa de 1 parcela.`);
    feePercent = settings.card_installments_fees["1"];
  }

  return Math.round(amountCents * (feePercent / 100));
}

/**
 * Calcula a data de liberação do saldo.
 */
function calculateReleaseDate(settings: FinalSettings, paymentMethod: string): string {
  let releaseDays: number;
  const method = paymentMethod.toLowerCase();

  if (method === 'pix') {
    releaseDays = settings.pix_release_days;
  } else if (method === 'bank_slip' || method === 'boleto') {
    releaseDays = settings.boleto_release_days;
  } else if (method === 'credit_card' || method === 'card') {
    releaseDays = settings.card_release_days;
  } else {
    // Fallback seguro
    releaseDays = 15;
  }

  const releaseDate = new Date();
  releaseDate.setDate(releaseDate.getDate() + releaseDays);
  return releaseDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}
