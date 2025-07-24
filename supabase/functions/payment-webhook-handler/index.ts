import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
}

// Função auxiliar para garantir que a resposta seja sempre um JSON válido
function createJsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: status,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // IMPORTANTE: Usar a chave de serviço (service_role_key) para dar à função
    // permissões de admin para acessar o banco, sem exigir um JWT na requisição.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    console.log('[WEBHOOK_RECEIVED] Payload recebido:', payload);

    // Validação mínima para garantir que é um webhook do Asaas
    if (!payload.event || !payload.payment) {
      throw new Error("Formato de webhook do Asaas inválido ou não reconhecido.");
    }
    
    const { event, payment } = payload;
    const gatewayTransactionId = payment.id;

    console.log(`[ASAAS_WEBHOOK] Evento: ${event}, ID da Transação: ${gatewayTransactionId}`);

    // Apenas processamos se for um evento de pagamento confirmado ou recebido
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      
      const { data: sale, error: saleError } = await supabaseAdmin
        .from('sales')
        .select('*')
        .eq('gateway_transaction_id', gatewayTransactionId)
        .single();

      if (saleError) {
        // Se a venda não for encontrada, retornamos 200 OK para o Asaas não reenviar.
        console.warn(`[SALE_NOT_FOUND] Venda para transação ${gatewayTransactionId} não encontrada. Webhook ignorado.`);
        return createJsonResponse({ success: true, message: 'Venda não encontrada, webhook ignorado.' }, 200);
      }
      
      // Idempotência: não processar se já estiver paga
      if (sale.status === 'paid') {
        console.log(`[IDEMPOTENCY_CHECK] Venda ${sale.id} já está 'paid'. Ignorando webhook.`);
        return createJsonResponse({ success: true, message: 'Webhook ignorado (venda já paga).' }, 200);
      }
      
      // Get product and producer information for calculations
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('producer_id')
        .eq('id', sale.product_id)
        .single();

      if (productError) {
        throw new Error(`Failed to fetch product ${sale.product_id}: ${productError.message}`);
      }

      // Get payment date from Asaas payload
      const paymentDateString = payment.paymentDate; // ex: "2025-07-24"
      
      if (!paymentDateString) {
        throw new Error("Webhook do Asaas não contém 'paymentDate'.");
      }
      
      // Convert "YYYY-MM-DD" to Date object safely with noon UTC to avoid timezone issues
      const paidAt = new Date(`${paymentDateString}T12:00:00Z`);
      
      if (isNaN(paidAt.getTime())) {
        throw new Error(`Data de pagamento inválida: ${paymentDateString}`);
      }

      // Get platform settings and producer settings for security reserve
      const [platformResult, producerResult] = await Promise.all([
        supabaseAdmin.from('platform_settings').select('default_security_reserve_percent, default_security_reserve_days').single(),
        supabaseAdmin.from('producer_settings').select('custom_security_reserve_percent, custom_security_reserve_days').eq('producer_id', product.producer_id).maybeSingle()
      ]);

      const defaultSecurityReservePercent = platformResult.data?.default_security_reserve_percent || 4.0;
      const defaultSecurityReserveDays = platformResult.data?.default_security_reserve_days || 30;
      
      const customSecurityReservePercent = producerResult.data?.custom_security_reserve_percent;
      const customSecurityReserveDays = producerResult.data?.custom_security_reserve_days;
      
      const securityReservePercent = customSecurityReservePercent !== null ? customSecurityReservePercent : defaultSecurityReservePercent;
      const securityReserveDays = customSecurityReserveDays !== null ? customSecurityReserveDays : defaultSecurityReserveDays;

      // Calculate security reserve amount
      const securityReserveCents = Math.round(sale.amount_total_cents * (securityReservePercent / 100));
      
      // Recalculate producer share: amount_total - platform_fee - security_reserve
      const recalculatedProducerShare = sale.amount_total_cents - sale.platform_fee_cents - securityReserveCents;

      // Calculate release date based on payment date
      const releaseDate = new Date(paidAt.getTime() + (securityReserveDays * 24 * 60 * 60 * 1000));

      console.log(`[SECURITY_RESERVE] Security reserve: ${securityReserveCents} cents (${securityReservePercent}%)`);
      console.log(`[PRODUCER_SHARE] Recalculated producer share: ${recalculatedProducerShare} cents`);

      const updatePayload = {
        status: 'paid',
        paid_at: paidAt.toISOString(),
        payout_status: 'pending',
        gateway_status: payment.status,
        security_reserve_cents: securityReserveCents,
        producer_share_cents: recalculatedProducerShare,
        release_date: releaseDate.toISOString().split('T')[0] // Store as date only
      };
      
      const { error: updateError } = await supabaseAdmin
        .from('sales')
        .update(updatePayload)
        .eq('id', sale.id);

      if (updateError) {
        throw new Error(`Falha ao atualizar a venda ${sale.id}: ${updateError.message}`);
      }
      
      // Add only the available amount (producer_share without security reserve) to producer balance
      if (recalculatedProducerShare > 0) {
        const { error: balanceError } = await supabaseAdmin.rpc('upsert_producer_balance', {
          p_producer_id: product.producer_id,
          amount_to_add: recalculatedProducerShare
        });

        if (balanceError) {
          console.error(`[BALANCE_ERROR] Failed to update producer balance: ${balanceError.message}`);
          // Don't throw here to avoid marking the payment as failed
        } else {
          console.log(`[BALANCE_UPDATED] Added ${recalculatedProducerShare} cents to producer ${product.producer_id} balance`);
        }
      }
      
      console.log(`[SALE_UPDATED] Venda ${sale.id} atualizada para 'paid' com reserva de segurança de ${securityReserveCents} cents.`);
    } else {
      console.log(`[EVENT_IGNORED] Evento "${event}" não requer ação.`);
    }

    // Responde 200 OK para o Asaas para indicar que o webhook foi recebido com sucesso.
    return createJsonResponse({ success: true, message: 'Webhook processado com sucesso.' }, 200);

  } catch (error) {
    console.error('[CRITICAL_ERROR] Erro no webhook handler:', error.message);
    // Retorna 400 em caso de erro de processamento, mas um erro 500 seria mais apropriado para falhas internas.
    return createJsonResponse({ success: false, message: error.message }, 400);
  }
});