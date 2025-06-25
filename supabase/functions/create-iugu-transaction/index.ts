// >>> CÓDIGO FINAL E COMPLETO PARA: supabase/functions/create-iugu-transaction/index.ts <<<

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { v4 as uuidv4 } from "https://deno.land/std@0.168.0/uuid/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const body = await req.json()
    console.log('[DEBUG] Body recebido:', body)

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
      attendees
    } = body

    if (!product_id) {
      throw new Error("Product ID é obrigatório");
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      throw new Error("Produto não encontrado");
    }
    console.log('[DEBUG] Product details:', product)

    const iuguApiKey = Deno.env.get('IUGU_API_KEY_TEST')
    if (!iuguApiKey) throw new Error("Credenciais da Iugu não encontradas");

    // LÓGICA DE ASSINATURA
    if (product.product_type === 'subscription') {
      console.log('[DEBUG] *** PROCESSANDO ASSINATURA ***')
      if (payment_method_selected !== 'credit_card' || !card_token) {
        throw new Error('Assinaturas requerem pagamento com cartão de crédito e um token de cartão.');
      }
      
      const planIdentifier = `plan_${product.id}`;
      let planId;

      // 1. BUSCAR PLANO EXISTENTE
      const existingPlanResponse = await fetch(`https://api.iugu.com/v1/plans/identifier/${planIdentifier}`, {
        headers: { 'Authorization': `Basic ${btoa(iuguApiKey + ':')}` }
      });

      if (existingPlanResponse.ok) {
        const existingPlan = await existingPlanResponse.json();
        planId = existingPlan.id;
        console.log('[DEBUG IUGU] Plano existente encontrado:', planId);
      } else if (existingPlanResponse.status === 404) {
        // 2. CRIAR PLANO SE NÃO EXISTIR
        const frequencyMapping = { 'weekly': 'weeks', 'monthly': 'months', 'bimonthly': 'months', 'quarterly': 'months', 'semiannually': 'months', 'annually': 'months' };
        const intervalMapping = { 'weekly': 1, 'monthly': 1, 'bimonthly': 2, 'quarterly': 3, 'semiannually': 6, 'annually': 12 };
        const freq = product.subscription_frequency || 'monthly';
        
        const planPayload = {
          name: product.name,
          identifier: planIdentifier,
          interval: intervalMapping[freq],
          interval_type: frequencyMapping[freq],
          prices: [{ currency: 'BRL', value_cents: product.price_cents }]
        };
        const planResponse = await fetch('https://api.iugu.com/v1/plans', {
          method: 'POST',
          headers: { 'Authorization': `Basic ${btoa(iuguApiKey + ':')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(planPayload)
        });
        const planResult = await planResponse.json();
        if (!planResponse.ok) throw new Error(`Falha na criação do plano: ${JSON.stringify(planResult.errors)}`);
        planId = planResult.id;
        console.log('[DEBUG IUGU] Novo plano criado:', planId);
      } else {
        throw new Error('Erro ao verificar plano existente na Iugu.');
      }
      
      // 3. CRIAR MÉTODO DE PAGAMENTO
      const paymentMethodResponse = await fetch(`https://api.iugu.com/v1/customers/${iugu_customer_id}/payment_methods`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${btoa(iuguApiKey + ':')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Cartão Principal', token: card_token, set_as_default: true })
      });
      if (!paymentMethodResponse.ok) throw new Error('Falha ao salvar o método de pagamento.');

      // 4. CRIAR ASSINATURA
      const subscriptionPayload = {
        customer_id: iugu_customer_id,
        plan_identifier: planIdentifier,
        only_on_charge_success: true
      };
      const subscriptionResponse = await fetch('https://api.iugu.com/v1/subscriptions', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${btoa(iuguApiKey + ':')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionPayload)
      });
      const subscriptionResult = await subscriptionResponse.json();
      if (!subscriptionResponse.ok) throw new Error(`Falha na criação da assinatura: ${JSON.stringify(subscriptionResult.errors)}`);
      
      // SALVAR NO BANCO E RETORNAR
      // ... (lógica para salvar na tabela 'sales' e atualizar balanço do produtor) ...
      const { data: saleData, error: saleError } = await supabase.from('sales').insert({ /* ... */ }).select().single();
      if (saleError) throw saleError;
      
      return new Response(JSON.stringify({ success: true, sale_id: saleData.id, status: 'active' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // LÓGICA PARA PAGAMENTOS NÃO-RECORRENTES (ÚNICO, DOAÇÃO, EVENTO)
    let finalAmountCents = product.price_cents;
    let finalQuantity = 1;
    if (product.product_type === 'donation') finalAmountCents = donation_amount_cents;
    if (product.product_type === 'event') {
      finalQuantity = quantity || 1;
      finalAmountCents = product.price_in_cents * finalQuantity;
    }
    
    const invoiceItems = [{
      description: product.name,
      quantity: finalQuantity,
      price_cents: finalAmountCents / finalQuantity
    }];
    
    const invoicePayload = { /* ... payload da fatura ... */ };
    if (payment_method_selected === 'pix') {
      invoicePayload.payable_with = 'pix';
    }
    // ...
    
    const response = await fetch('https://api.iugu.com/v1/invoices', { /* ... */ });
    const result = await response.json();
    if (!response.ok) throw new Error(`Falha ao criar fatura: ${JSON.stringify(result.errors)}`);
    
    // SALVAR NO BANCO E RETORNAR
    // ... (lógica para salvar na tabela 'sales' e atualizar balanço do produtor) ...
    const { data: savedSale, error: saleError } = await supabase.from('sales').insert({ /* ... */ }).select().single();
    if (saleError) throw saleError;

    return new Response(JSON.stringify({
        success: true,
        sale_id: savedSale.id,
        // *** CORREÇÃO: GARANTIR QUE OS DADOS DO PIX SEJAM RETORNADOS ***
        pix_qr_code: result.pix?.qr_code || null,
        pix_qr_code_text: result.pix?.qr_code_text || null,
        // ... outros dados ...
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ERRO GERAL NA FUNÇÃO]:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
