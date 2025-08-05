import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

      // --- START OF CORRECTED CALCULATION LOGIC ---
      
      // 1. Get the payment date from the webhook payload.
      const paidAtString = payment.paymentDate; // Format "YYYY-MM-DD"
      if (!paidAtString) {
        throw new Error("Webhook payload is missing 'paymentDate'.");
      }
      const paidAtDate = new Date(`${paidAtString}T12:00:00Z`); // Use noon UTC for safety
      
      if (isNaN(paidAtDate.getTime())) {
        throw new Error(`Invalid payment date: ${paidAtString}`);
      }

      // 2. Fetch the financial settings using the new helper function
      const settings = await getFinancialSettings(supabaseAdmin, product.producer_id);

      // 3. Calculate all fees and values based on the business rules.
      const amountTotalCents = sale.amount_total_cents;
      
      // Get original product price for fee calculation (fallback to amount_total_cents if not available)
      const originalPriceCents = sale.original_product_price_cents || amountTotalCents;

      // Platform Fee = (Original Product Price * Fee %) + Fixed Fee
      // CRITICAL: Always calculate fees based on original product price, not final amount with interest
      const platformFeeCents = calculatePlatformFee(
        settings, 
        sale.payment_method_used, 
        sale.installments_chosen || 1, 
        originalPriceCents
      );

      // Security Reserve = Original Product Price * Security Reserve %
      const securityReservePercent = settings.security_reserve_percent || 0;
      const securityReserveCents = Math.round(originalPriceCents * (securityReservePercent / 100));

      // Calculate producer's net share based on who assumes installment costs
      let producerShareCents;
      
      // Check if producer assumes installments (from product settings)
      const { data: productSettings, error: productSettingsError } = await supabaseAdmin
        .from('products')
        .select('producer_assumes_installments')
        .eq('id', sale.product_id)
        .single();
      
      const producerAssumesInstallments = productSettings?.producer_assumes_installments || false;
      
      if (producerAssumesInstallments && sale.installments_chosen > 1) {
        // Producer assumes installment costs - deduct interest from producer share
        // Get interest rate from platform settings
        const { data: platformSettings } = await supabaseAdmin
          .from('platform_settings')
          .select('card_installment_interest_rate')
          .eq('id', 1)
          .single();
        
        const interestRate = (platformSettings?.card_installment_interest_rate || 3.5) / 100;
        const originalCustomerAmount = amountTotalCents / Math.pow(1 + interestRate, sale.installments_chosen);
        
        // Producer gets the original amount minus platform fee, but loses the interest difference
        producerShareCents = Math.round(originalCustomerAmount - platformFeeCents);
        
        console.log(`[PRODUCER_ASSUMES_INTEREST] Interest rate: ${interestRate * 100}%, Original customer amount: ${originalCustomerAmount}, Producer share: ${producerShareCents}`);
      } else {
        // Customer pays interest OR it's a single payment - producer gets full share
        producerShareCents = originalPriceCents - platformFeeCents;
        
        console.log(`[CUSTOMER_PAYS_INTEREST] Producer gets full share: ${producerShareCents}`);
      }

      // Calculate the release date based on the payment method.
      const releaseDate = calculateReleaseDate(settings, sale.payment_method_used, paidAtDate);

      console.log(`[FINAL_CALCULATION] Amount Total (with interest): ${amountTotalCents} cents`);
      console.log(`[FINAL_CALCULATION] Original Product Price: ${originalPriceCents} cents`);
      console.log(`[FINAL_CALCULATION] Platform Fee (on original): ${platformFeeCents} cents`);
      console.log(`[FINAL_CALCULATION] Security Reserve (on original): ${securityReserveCents} cents (${securityReservePercent}%)`);
      console.log(`[FINAL_CALCULATION] Producer Share: ${producerShareCents} cents`);
      console.log(`[FINAL_CALCULATION] Release Date: ${releaseDate}`);

      // 4. Assemble the final, correct payload to save to the database.
      const updatePayload = {
        status: 'paid',
        paid_at: paidAtDate.toISOString(),
        payout_status: 'pending',
        release_date: releaseDate,
        platform_fee_cents: platformFeeCents,
        producer_share_cents: producerShareCents,    // Saves the correct net value
        security_reserve_cents: securityReserveCents,  // Saves the reserve amount
        gateway_status: payment.status
      };

      console.log('[FINAL_CALCULATION] Data to be saved:', updatePayload);
      
      // --- END OF CORRECTED CALCULATION LOGIC ---
      
      const { error: updateError } = await supabaseAdmin
        .from('sales')
        .update(updatePayload)
        .eq('id', sale.id);

      if (updateError) {
        throw new Error(`Falha ao atualizar a venda ${sale.id}: ${updateError.message}`);
      }
      
      // Add only the available amount (producer_share without security reserve) to producer balance
      if (producerShareCents > 0) {
        const { error: balanceError } = await supabaseAdmin.rpc('upsert_producer_balance', {
          p_producer_id: product.producer_id,
          amount_to_add: producerShareCents
        });

        if (balanceError) {
          console.error(`[BALANCE_ERROR] Failed to update producer balance: ${balanceError.message}`);
          // Don't throw here to avoid marking the payment as failed
        } else {
          console.log(`[BALANCE_UPDATED] Added ${producerShareCents} cents to producer ${product.producer_id} balance`);
        }
      }
      
      console.log(`[SALE_UPDATED] Sale ${sale.id} updated to 'paid' with security reserve of ${securityReserveCents} cents.`);
      
      // --- INÍCIO DA NOVA LÓGICA DE MATRÍCULA ---

      // 1. Encontrar ou criar o usuário com base no e-mail da venda
      let { data: userData, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', sale.buyer_email)
        .single();

      // Se o usuário não existir, crie-o
      if (userError || !userData) {
        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: sale.buyer_email,
          email_confirm: true, // Auto-confirma o e-mail
        });
        if (authError) throw new Error(`Falha ao criar usuário: ${authError.message}`);
        userData = { id: newUser.user.id };
      }
      
      const studentUserId = userData.id;

      // 2. Criar a matrícula na tabela 'enrollments'
      const { error: enrollmentError } = await supabaseAdmin
        .from('enrollments')
        .insert({
          user_id: studentUserId,
          product_id: sale.product_id,
        });
      
      if (enrollmentError) {
        // Loga o erro mas não quebra o fluxo para garantir que o pagamento seja processado
        console.error(`[ENROLLMENT_ERROR] Falha ao matricular aluno ${studentUserId} no produto ${sale.product_id}:`, enrollmentError.message);
      } else {
        console.log(`[ENROLLMENT_SUCCESS] Aluno ${studentUserId} matriculado com sucesso no produto ${sale.product_id}.`);
      }

      // --- FIM DA NOVA LÓGICA DE MATRÍCULA ---
      
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