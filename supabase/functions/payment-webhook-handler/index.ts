import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ===================================================================
// SEÇÃO 1: FUNÇÕES HELPER (INTOCADAS DO SEU CÓDIGO ORIGINAL)
// ===================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
}

// Helper function to ensure response is always valid JSON
function createJsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: status,
  });
}

// Helper function to get financial settings for calculations
async function getFinancialSettings(supabase: any, producerId: string) {
  const [platformResult, producerResult] = await Promise.all([
    supabase.from('platform_settings').select('*').single(),
    supabase.from('producer_settings').select('*').eq('producer_id', producerId).maybeSingle()
  ]);

  const platform = platformResult.data;
  const producer = producerResult.data;

  return {
    // Security reserve settings
    security_reserve_percent: producer?.custom_security_reserve_percent ?? platform?.default_security_reserve_percent ?? 4.0,
    security_reserve_days: producer?.custom_security_reserve_days ?? platform?.default_security_reserve_days ?? 30,
    
    // Fee settings
    fixed_fee_cents: producer?.custom_fixed_fee_cents ?? platform?.default_fixed_fee_cents ?? 100,
    withdrawal_fee_cents: producer?.custom_withdrawal_fee_cents ?? platform?.default_withdrawal_fee_cents ?? 367,
    
    // Payment method fees
    pix_fee_percent: platform?.default_pix_fee_percent ?? 3.0,
    boleto_fee_percent: platform?.default_boleto_fee_percent ?? 3.5,
    card_fee_percent: platform?.default_card_fee_percent ?? 5.0,
    
    // Release days
    pix_release_days: platform?.default_pix_release_days ?? 1,
    boleto_release_days: platform?.default_boleto_release_days ?? 1,
    card_release_days: platform?.default_card_release_days ?? 30,
  };
}

// Helper function to calculate platform fee based on payment method and installments
function calculatePlatformFee(settings: any, paymentMethod: string, installments: number, originalAmountCents: number) {
  let feePercent = 0;
  if (paymentMethod === 'pix') {
    feePercent = settings.pix_fee_percent;
  } else if (paymentMethod === 'bank_slip') {
    feePercent = settings.boleto_fee_percent;
  } else if (paymentMethod === 'credit_card') {
    // For credit card, use the new base fee percentage
    feePercent = settings.card_fee_percent || 5.0;
  }
  
  // Platform Fee = (Original Product Amount * Fee %) + Fixed Fee
  // IMPORTANT: Always calculate fees based on original product price, not final amount with interest
  const percentageFee = Math.round(originalAmountCents * (feePercent / 100));
  return percentageFee + settings.fixed_fee_cents;
}

// Helper function to calculate release date based on payment method
function calculateReleaseDate(settings: any, paymentMethod: string, paidAtDate: Date) {
  let releaseDays = settings.card_release_days; // default
  
  if (paymentMethod === 'pix') {
    releaseDays = settings.pix_release_days;
  } else if (paymentMethod === 'bank_slip') {
    releaseDays = settings.boleto_release_days;
  }
  
  const releaseDate = new Date(paidAtDate.getTime() + (releaseDays * 24 * 60 * 60 * 1000));
  return releaseDate.toISOString().split('T')[0]; // Return as date string
}

// ===================================================================
// SEÇÃO 2: SERVIDOR PRINCIPAL (COM A LÓGICA DE MATRÍCULA CORRIGIDA)
// ===================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    if (!payload.event || !payload.payment) {
      throw new Error("Formato de webhook do Asaas inválido ou não reconhecido.");
    }
    
    const { event, payment } = payload;
    const gatewayTransactionId = payment.id;

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      
      const { data: sale, error: saleError } = await supabaseAdmin
        .from('sales')
        .select('*')
        .eq('gateway_transaction_id', gatewayTransactionId)
        .single();

      if (saleError) {
        console.warn(`[SALE_NOT_FOUND] Venda para transação ${gatewayTransactionId} não encontrada. Webhook ignorado.`);
        return createJsonResponse({ success: true, message: 'Venda não encontrada, webhook ignorado.' }, 200);
      }
      
      if (sale.status === 'paid') {
        console.log(`[IDEMPOTENCY_CHECK] Venda ${sale.id} já está 'paid'. Ignorando webhook.`);
        return createJsonResponse({ success: true, message: 'Webhook ignorado (venda já paga).' }, 200);
      }
      
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('producer_id')
        .eq('id', sale.product_id)
        .single();

      if (productError) {
        throw new Error(`Failed to fetch product ${sale.product_id}: ${productError.message}`);
      }

      // --- LÓGICA FINANCEIRA (EXATAMENTE COMO NO ORIGINAL) ---
      const paidAtDate = new Date(`${payment.paymentDate}T12:00:00Z`);
      if (isNaN(paidAtDate.getTime())) throw new Error(`Invalid payment date: ${payment.paymentDate}`);
      const settings = await getFinancialSettings(supabaseAdmin, product.producer_id);
      const originalPriceCents = sale.original_product_price_cents || sale.amount_total_cents;
      const platformFeeCents = calculatePlatformFee(settings, sale.payment_method_used, sale.installments_chosen || 1, originalPriceCents);
      const securityReserveCents = Math.round(originalPriceCents * ((settings.security_reserve_percent || 0) / 100));
      const { data: productSettings } = await supabaseAdmin.from('products').select('producer_assumes_installments').eq('id', sale.product_id).single();
      const producerAssumesInstallments = productSettings?.producer_assumes_installments || false;
      let producerShareCents;
      if (producerAssumesInstallments && sale.installments_chosen > 1) {
        const { data: platformSettings } = await supabaseAdmin.from('platform_settings').select('card_installment_interest_rate').eq('id', 1).single();
        const interestRate = (platformSettings?.card_installment_interest_rate || 3.5) / 100;
        const originalCustomerAmount = sale.amount_total_cents / Math.pow(1 + interestRate, sale.installments_chosen);
        producerShareCents = Math.round(originalCustomerAmount - platformFeeCents);
      } else {
        producerShareCents = originalPriceCents - platformFeeCents;
      }
      const releaseDate = calculateReleaseDate(settings, sale.payment_method_used, paidAtDate);
      const updatePayload = {
        status: 'paid', paid_at: paidAtDate.toISOString(), payout_status: 'pending',
        release_date: releaseDate, platform_fee_cents: platformFeeCents,
        producer_share_cents: producerShareCents, security_reserve_cents: securityReserveCents,
        gateway_status: payment.status
      };
      // --- FIM DA LÓGICA FINANCEIRA ---

      const { error: updateError } = await supabaseAdmin.from('sales').update(updatePayload).eq('id', sale.id);
      if (updateError) throw new Error(`Falha ao atualizar a venda ${sale.id}: ${updateError.message}`);

      if (producerShareCents > 0) {
        const { error: balanceError } = await supabaseAdmin.rpc('upsert_producer_balance', { p_producer_id: product.producer_id, amount_to_add: producerShareCents });
        if (balanceError) console.error(`[BALANCE_ERROR] Failed to update producer balance: ${balanceError.message}`);
      }
      
      // --- INÍCIO DA LÓGICA DE MATRÍCULA CORRIGIDA ---

      let { data: userData } = await supabaseAdmin.from('profiles').select('id').eq('email', sale.buyer_email).single();
      if (!userData) {
        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({ email: sale.buyer_email, email_confirm: true });
        if (authError) throw new Error(`Falha ao criar usuário: ${authError.message}`);
        userData = { id: newUser.user.id };
      }
      const studentUserId = userData.id;

      // PASSO 1: Encontrar o Space ligado a este produto.
      const { data: spaceData, error: spaceError } = await supabaseAdmin
        .from('spaces')
        .select('id')
        .eq('product_id', sale.product_id)
        .single();
      
      let activeCohortId = null;
      if (spaceError) {
        console.warn(`[ENROLLMENT_WARNING] Não foi encontrado um 'space' para o produto ${sale.product_id}. O aluno será matriculado sem turma.`);
      } else if (spaceData) {
        // PASSO 2: Encontrar a Turma Ativa dentro do Space.
        const { data: cohortData, error: cohortError } = await supabaseAdmin
          .from('cohorts')
          .select('id')
          .eq('space_id', spaceData.id)
          .eq('is_active', true)
          .single();
        
        if (cohortError || !cohortData) {
          console.warn(`[ENROLLMENT_WARNING] Nenhuma turma ativa encontrada para o space ${spaceData.id}. O aluno será matriculado sem turma.`);
        } else {
          activeCohortId = cohortData.id;
        }
      }

      // PASSO 3: Criar a matrícula com o ID da turma ativa (se encontrada).
      const { error: enrollmentError } = await supabaseAdmin
        .from('enrollments')
        .insert({
          user_id: studentUserId,
          product_id: sale.product_id,
          cohort_id: activeCohortId, // A CORREÇÃO
        });
      
      if (enrollmentError) {
        console.error(`[ENROLLMENT_ERROR] Falha ao matricular aluno ${studentUserId} no produto ${sale.product_id}:`, enrollmentError.message);
      } else {
        console.log(`[ENROLLMENT_SUCCESS] Aluno ${studentUserId} matriculado com sucesso no produto ${sale.product_id} e na turma ${activeCohortId || 'N/A'}.`);
      }

      // --- FIM DA NOVA LÓGICA DE MATRÍCULA ---
      
    } else {
      console.log(`[EVENT_IGNORED] Evento "${event}" não requer ação.`);
    }
    
    return createJsonResponse({ success: true, message: 'Webhook processado com sucesso.' }, 200);

  } catch (error) {
    console.error('[CRITICAL_ERROR] Erro no webhook handler:', error.message);
    return createJsonResponse({ success: false, message: error.message }, 400);
  }
});
