// Force redeploy
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
      
      // Lógica de cálculo (simplificada, pois as funções auxiliares já existem)
      const platformFee = sale.platform_fee_cents; // Assumindo que já foi calculado na criação
      const producerShare = sale.producer_share_cents; // Assumindo que já foi calculado
      // A data de liberação também deveria ser calculada aqui, baseada no `paid_at`.

      const updatePayload = {
        status: 'paid',
        paid_at: new Date().toISOString(),
        payout_status: 'pending',
        gateway_status: payment.status, // Atualiza com o status final do Asaas
        // Adicionar cálculo de release_date aqui
      };
      
      const { error: updateError } = await supabaseAdmin
        .from('sales')
        .update(updatePayload)
        .eq('id', sale.id);

      if (updateError) {
        throw new Error(`Falha ao atualizar a venda ${sale.id}: ${updateError.message}`);
      }
      
      console.log(`[SALE_UPDATED] Venda ${sale.id} atualizada para 'paid'.`);
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