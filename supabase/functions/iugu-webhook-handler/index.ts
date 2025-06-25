
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ... (interface IuguWebhookPayload pode permanecer a mesma) ...

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const platformFeePercentage = parseFloat(Deno.env.get('PLATFORM_FEE_PERCENTAGE') || '0.05');

    const payload = await req.json();
    const { event, data } = payload;
    const iuguInvoiceId = data.id;

    if (!iuguInvoiceId) {
      console.error('*** ERRO WEBHOOK: ID da fatura ausente no payload ***', payload);
      return new Response(JSON.stringify({ success: false, message: 'Invoice ID is missing' }), { status: 400, headers: corsHeaders });
    }

    // A lógica agora é centrada na FATURA (invoice)
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*, product:products(producer_id)')
      .or(`iugu_invoice_id.eq.${iuguInvoiceId},iugu_subscription_id.eq.${data.subscription_id}`) // Busca por fatura OU por ID de assinatura
      .limit(1)
      .single();
    
    if (saleError || !sale) {
      console.warn('*** AVISO WEBHOOK: Venda não encontrada para a fatura/assinatura. Ignorando webhook (retornando 200).', { iuguInvoiceId, subscription_id: data.subscription_id, error: saleError });
      return new Response(JSON.stringify({ success: true, message: 'Webhook received but sale not found' }), { status: 200, headers: corsHeaders });
    }

    console.log('*** DEBUG WEBHOOK: Venda encontrada:', { sale_id: sale.id, current_status: sale.status, iugu_event: event });

    // *** LÓGICA CORRIGIDA E CENTRALIZADA ***
    if (event === 'invoice.status_changed' && data.status === 'paid') {
      await handlePaidInvoice(supabase, sale, data, platformFeePercentage);
    } else if (event === 'invoice.refund') {
      await handleRefundedInvoice(supabase, sale, platformFeePercentage);
    } else if (event === 'subscription.suspended' || event === 'subscription.expired') {
      await handleSubscriptionStatusChange(supabase, data.id, 'expired');
    } else if (event === 'subscription.canceled') {
      await handleSubscriptionStatusChange(supabase, data.id, 'canceled');
    } else {
      console.log('*** DEBUG WEBHOOK: Evento não tratado:', event);
    }

    return new Response(JSON.stringify({ success: true, message: 'Webhook processed' }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('*** ERRO GERAL NO WEBHOOK:', error.message, error.stack);
    return new Response(JSON.stringify({ success: false, message: 'Internal Server Error' }), { status: 200, headers: corsHeaders }); // Retorna 200 para Iugu não re-tentar
  }
});

async function handlePaidInvoice(supabase: any, sale: any, invoiceData: any, platformFeePercentage: number) {
  if (sale.status === 'active' || sale.status === 'paid') {
    console.log('*** DEBUG WEBHOOK: Venda já está paga/ativa. Ignorando.', { sale_id: sale.id });
    return;
  }

  // Define o novo status: 'active' se for assinatura, 'paid' se for venda normal.
  const newStatus = sale.iugu_subscription_id ? 'active' : 'paid';
  console.log(`*** DEBUG WEBHOOK: Fatura paga. Mudando status de '${sale.status}' para '${newStatus}'. ***`);

  const amountTotalCents = sale.amount_total_cents;
  const platformFeeCents = Math.round(amountTotalCents * platformFeePercentage);
  const producerShareCents = amountTotalCents - platformFeeCents;

  const updateData = {
    status: newStatus,
    paid_at: new Date().toISOString(),
    platform_fee_cents: platformFeeCents,
    producer_share_cents: producerShareCents,
    updated_at: new Date().toISOString(),
  };

  const { error: updateSaleError } = await supabase
    .from('sales')
    .update(updateData)
    .eq('id', sale.id);

  if (updateSaleError) {
    console.error('*** ERRO WEBHOOK: Falha ao atualizar a venda para paga/ativa.', { sale_id: sale.id, error: updateSaleError });
    throw updateSaleError;
  }

  // Lógica para atualizar o saldo do produtor (UPSERT)
  const producerId = sale.product?.producer_id;
  if (producerId) {
    const { error: rpcError } = await supabase.rpc('upsert_producer_balance', {
      p_producer_id: producerId,
      amount_to_add: producerShareCents
    });
    if (rpcError) {
      console.error('*** ERRO WEBHOOK: Falha ao atualizar saldo do produtor via RPC.', { producer_id: producerId, error: rpcError });
    } else {
      console.log('*** DEBUG WEBHOOK: Saldo do produtor atualizado com sucesso.', { producer_id: producerId, added_amount: producerShareCents });
    }
  }
  
  console.log('*** DEBUG WEBHOOK: Fatura paga processada com sucesso.', { sale_id: sale.id });
}

async function handleSubscriptionStatusChange(supabase: any, iuguSubscriptionId: string, newStatus: 'expired' | 'canceled') {
  console.log(`*** DEBUG WEBHOOK: Atualizando status de assinatura para '${newStatus}'.`, { iuguSubscriptionId });
  
  const { error } = await supabase
    .from('sales')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('iugu_subscription_id', iuguSubscriptionId);

  if (error) {
    console.error(`*** ERRO WEBHOOK: Falha ao atualizar status da assinatura para '${newStatus}'.`, { iuguSubscriptionId, error });
  } else {
    console.log(`*** DEBUG WEBHOOK: Status da assinatura atualizado para '${newStatus}' com sucesso.`);
  }
}

// A função de reembolso e outras podem ser adicionadas aqui.
async function handleRefundedInvoice(supabase: any, sale: any, platformFeePercentage: number) {
  // ... implementação do reembolso ...
}
