import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('[DEBUG] *** INÍCIO DA FUNÇÃO create-iugu-transaction ***')
// Forcing redeploy - 2025-06-25 - Fixed Iugu plan creation payload

serve(async (req) => {
  console.log('[DEBUG] Método da requisição:', req.method)
  console.log('[DEBUG] URL da requisição:', req.url)
  console.log('[DEBUG] Headers da requisição:', Object.fromEntries(req.headers.entries()))

  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS')
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

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      console.error('[ERROR] Product not found:', productError)
      return new Response(
        JSON.stringify({ success: false, error: 'Product not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[DEBUG] Product details:', product)

    // Calculate final amount
    let finalAmountCents = product.price_cents
    if (product.product_type === 'donation' && donation_amount_cents) {
      finalAmountCents = donation_amount_cents
    }
    if (product.product_type === 'event' && quantity) {
      finalAmountCents = product.price_cents * quantity
    }

    console.log('[DEBUG] Final amount cents:', finalAmountCents)

    const iuguApiKey = Deno.env.get('APP_ENV') === 'production' 
      ? Deno.env.get('IUGU_API_KEY_LIVE')
      : Deno.env.get('IUGU_API_KEY_TEST')

    const iuguAccountId = Deno.env.get('APP_ENV') === 'production'
      ? Deno.env.get('IUGU_ACCOUNT_ID_LIVE') 
      : Deno.env.get('IUGU_ACCOUNT_ID_TEST')

    if (!iuguApiKey || !iuguAccountId) {
      console.error('[ERROR] Missing Iugu API credentials')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Iugu API credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle subscription flow
    if (product.product_type === 'subscription') {
      console.log('[DEBUG] *** PROCESSING SUBSCRIPTION ***')
      
      // Only credit card is allowed for subscriptions
      if (payment_method_selected !== 'credit_card' || !card_token) {
        console.error('[ERROR] Invalid payment method for subscription')
        return new Response(
          JSON.stringify({ success: false, error: 'Subscriptions require credit card payment' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Step 1: Create/Verify Plan
      console.log('[DEBUG IUGU] Step 1: Tentando criar/verificar plano...')
      const planIdentifier = `plan_${product.id}`
      
      // Map subscription frequency to Iugu interval_type
      const frequencyMapping = {
        'weekly': 'weeks',
        'monthly': 'months',
        'bimonthly': 'months',
        'quarterly': 'months',
        'semiannually': 'months',
        'annually': 'months'
      }
      
      const intervalMapping = {
        'weekly': 1,
        'monthly': 1,
        'bimonthly': 2,
        'quarterly': 3,
        'semiannually': 6,
        'annually': 12
      }
      
      const subscriptionFrequency = product.subscription_frequency || 'monthly'
      const intervalType = frequencyMapping[subscriptionFrequency] || 'months'
      const interval = intervalMapping[subscriptionFrequency] || 1
      
      const planPayload = {
        name: product.name,
        identifier: planIdentifier,
        interval: interval,
        interval_type: intervalType,
        prices: [
          {
            currency: 'BRL',
            value_cents: finalAmountCents
          }
        ]
      }

      console.log('[DEBUG IUGU] Plan payload:', planPayload)

      let planId;
      try {
        const planResponse = await fetch('https://api.iugu.com/v1/plans', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(iuguApiKey + ':')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(planPayload)
        })

        const planResult = await planResponse.json()
        console.log('[DEBUG IUGU] Plan creation response status:', planResponse.status)
        console.log('[DEBUG IUGU] Plan creation result:', planResult)

        if (!planResponse.ok && planResult.errors?.identifier?.[0] === 'já está em uso') {
          // Plan already exists, fetch it
          console.log('[DEBUG IUGU] Plano já existe, buscando plano existente...')
          try {
            const existingPlanResponse = await fetch(`https://api.iugu.com/v1/plans?query=${planIdentifier}`, {
              headers: {
                'Authorization': `Basic ${btoa(iuguApiKey + ':')}`
              }
            })
            const existingPlanResult = await existingPlanResponse.json()
            console.log('[DEBUG IUGU] Existing plan search result:', existingPlanResult)
            
            if (existingPlanResult.items && existingPlanResult.items.length > 0) {
              planId = existingPlanResult.items[0].id
              console.log('[DEBUG IUGU] Plano existente encontrado com ID:', planId)
            } else {
              throw new Error('Could not find existing plan')
            }
          } catch (searchError) {
            console.error('[ERRO FATAL IUGU] Erro ao buscar plano existente:', searchError.message)
            throw new Error(`Failed to find existing plan: ${searchError.message}`)
          }
        } else if (!planResponse.ok) {
          console.error('[ERRO FATAL IUGU] Falha na criação do plano. Status:', planResponse.status)
          console.error('[ERRO FATAL IUGU] Detalhes do erro da Iugu:', planResult)
          throw new Error(`Plan creation failed: ${JSON.stringify(planResult)}`)
        } else {
          planId = planResult.id
          console.log('[DEBUG IUGU] Plano criado com sucesso. ID:', planId)
        }
      } catch (planError) {
        console.error('[ERRO FATAL IUGU] Erro no Step 1 (Plan creation):', planError.message)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to create/verify plan',
            details: planError.message 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Step 2: Customer is already created (iugu_customer_id provided)
      console.log('[DEBUG IUGU] Step 2: Using existing customer:', iugu_customer_id)

      // Step 3: Create Payment Method
      console.log('[DEBUG IUGU] Step 3: Tentando criar método de pagamento...')
      const paymentMethodPayload = {
        description: 'Cartão de Crédito',
        token: card_token,
        set_as_default: true
      }

      console.log('[DEBUG IUGU] Payment method payload:', paymentMethodPayload)

      let paymentMethodId;
      try {
        const paymentMethodResponse = await fetch(`https://api.iugu.com/v1/customers/${iugu_customer_id}/payment_methods`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(iuguApiKey + ':')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentMethodPayload)
        })

        const paymentMethodResult = await paymentMethodResponse.json()
        console.log('[DEBUG IUGU] Payment method response status:', paymentMethodResponse.status)
        console.log('[DEBUG IUGU] Payment method result:', paymentMethodResult)

        if (!paymentMethodResponse.ok) {
          console.error('[ERRO FATAL IUGU] Falha na criação do método de pagamento. Status:', paymentMethodResponse.status)
          console.error('[ERRO FATAL IUGU] Detalhes do erro da Iugu:', paymentMethodResult)
          throw new Error(`Payment method creation failed: ${JSON.stringify(paymentMethodResult)}`)
        }

        paymentMethodId = paymentMethodResult.id
        console.log('[DEBUG IUGU] Método de pagamento criado com sucesso. ID:', paymentMethodId)
      } catch (paymentMethodError) {
        console.error('[ERRO FATAL IUGU] Erro no Step 3 (Payment Method creation):', paymentMethodError.message)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to create payment method',
            details: paymentMethodError.message 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Step 4: Create Subscription
      console.log('[DEBUG IUGU] Step 4: Tentando criar assinatura...')
      const subscriptionPayload = {
        customer_id: iugu_customer_id,
        plan_identifier: planIdentifier,
        only_on_charge_success: true
      }

      console.log('[DEBUG IUGU] Subscription payload:', subscriptionPayload)

      let subscriptionResult;
      try {
        const subscriptionResponse = await fetch('https://api.iugu.com/v1/subscriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(iuguApiKey + ':')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(subscriptionPayload)
        })

        subscriptionResult = await subscriptionResponse.json()
        console.log('[DEBUG IUGU] Subscription response status:', subscriptionResponse.status)
        console.log('[DEBUG IUGU] Subscription result:', subscriptionResult)

        if (!subscriptionResponse.ok) {
          console.error('[ERRO FATAL IUGU] Falha na criação da assinatura. Status:', subscriptionResponse.status)
          console.error('[ERRO FATAL IUGU] Detalhes do erro da Iugu:', subscriptionResult)
          throw new Error(`Subscription creation failed: ${JSON.stringify(subscriptionResult)}`)
        }

        console.log('[DEBUG IUGU] Assinatura criada com sucesso. ID:', subscriptionResult.id)
      } catch (subscriptionError) {
        console.error('[ERRO FATAL IUGU] Erro no Step 4 (Subscription creation):', subscriptionError.message)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to create subscription',
            details: subscriptionError.message 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Calculate platform fee (5% of total)
      const platformFeeCents = Math.round(finalAmountCents * 0.05)
      const producerShareCents = finalAmountCents - platformFeeCents

      // Save to sales table with active status
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          product_id,
          buyer_email,
          buyer_profile_id,
          payment_method_used: payment_method_selected,
          amount_total_cents: finalAmountCents,
          platform_fee_cents: platformFeeCents,
          producer_share_cents: producerShareCents,
          installments_chosen: installments || 1,
          iugu_subscription_id: subscriptionResult.id,
          status: 'active' // Set as active since only_on_charge_success guarantees first payment success
        })
        .select()
        .single()

      if (saleError) {
        console.error('[ERROR] Failed to save sale:', saleError)
        throw new Error('Failed to save sale record')
      }

      console.log('[DEBUG] Sale saved successfully:', saleData)

      // Update producer balance
      await supabase.rpc('upsert_producer_balance', {
        p_producer_id: product.producer_id,
        amount_to_add: producerShareCents
      })

      console.log('[DEBUG] *** SUBSCRIPTION PROCESSING COMPLETE ***')

      return new Response(
        JSON.stringify({
          success: true,
          sale_id: saleData.id,
          subscription_id: subscriptionResult.id,
          message: 'Subscription created successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Regular payment processing
    console.log('[DEBUG] *** PROCESSING REGULAR PAYMENT ***')

    const today = new Date()
    const dueDate = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000)) // 3 days from now

    const invoiceItems = [{
      description: product.name,
      quantity: product.product_type === 'event' ? (quantity || 1) : 1,
      price_cents: product.product_type === 'event' ? (quantity || 1) : 1,
      price_cents: product.product_type === 'donation' ? donation_amount_cents : product.price_cents
    }]

    const invoicePayload = {
      email: buyer_email,
      due_date: dueDate.toISOString().split('T')[0],
      items: invoiceItems,
      return_url: `${req.headers.get('origin')}/payment-confirmation`,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/iugu-webhook-handler`,
      customer_id: iugu_customer_id,
      custom_variables: [
        { name: 'product_id', value: product_id },
        { name: 'buyer_profile_id', value: buyer_profile_id || '' }
      ]
    }

    // Add payment method specific configurations
    if (payment_method_selected === 'credit_card' && card_token) {
      invoicePayload.payable_with = 'credit_card'
      invoicePayload.payment_method = 'credit_card'
      invoicePayload.token = card_token
      if (installments && installments > 1) {
        invoicePayload.months = installments
      }
    } else if (payment_method_selected === 'pix') {
      invoicePayload.payable_with = 'pix'
      invoicePayload.pix = { generate_qr_code: true, qr_code_format: 'base64' }
    } else if (payment_method_selected === 'bank_slip') {
      invoicePayload.payable_with = 'bank_slip'
    }

    console.log('[DEBUG] Invoice payload:', invoicePayload)

    const response = await fetch('https://api.iugu.com/v1/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(iuguApiKey + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoicePayload)
    })

    const result = await response.json()
    console.log('[DEBUG] Iugu response:', result)

    if (!response.ok) {
      console.error('[ERROR] Iugu API error:', result)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment processing failed',
          iugu_errors: result.errors 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate platform fee (5% of total)
    const platformFeeCents = Math.round(finalAmountCents * 0.05)
    const producerShareCents = finalAmountCents - platformFeeCents

    // Save transaction to database
    const saleData = {
      product_id,
      buyer_email,
      buyer_profile_id,
      payment_method_used: payment_method_selected,
      amount_total_cents: finalAmountCents,
      platform_fee_cents: platformFeeCents,
      producer_share_cents: producerShareCents,
      iugu_invoice_id: result.id,
      iugu_charge_id: result.charge_id || null,
      iugu_invoice_secure_url: result.secure_url || null,
      iugu_pix_qr_code_base64: result.pix?.qr_code || null,
      iugu_pix_qr_code_text: result.pix?.qr_code_text || null,
      iugu_bank_slip_barcode: result.bank_slip?.barcode || null,
      installments_chosen: installments || 1,
      status: payment_method_selected === 'credit_card' ? 'paid' : 'pending'
    }

    // Add event attendees if present
    if (product.product_type === 'event' && attendees) {
      saleData.event_attendees = attendees
    }

    const { data: savedSale, error: saleError } = await supabase
      .from('sales')
      .insert(saleData)
      .select()
      .single()

    if (saleError) {
      console.error('[ERROR] Failed to save sale:', saleError)
      throw new Error('Failed to save transaction')
    }

    // If credit card payment is successful, update producer balance immediately
    if (payment_method_selected === 'credit_card' && result.status === 'paid') {
      await supabase.rpc('upsert_producer_balance', {
        p_producer_id: product.producer_id,
        amount_to_add: producerShareCents
      })
    }

    console.log('[DEBUG] *** REGULAR PAYMENT PROCESSING COMPLETE ***')

    return new Response(
      JSON.stringify({
        success: true,
        sale_id: savedSale.id,
        invoice_url: result.secure_url,
        pix_qr_code: result.pix?.qr_code,
        pix_qr_code_text: result.pix?.qr_code_text,
        bank_slip_barcode: result.bank_slip?.barcode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ERROR] Transaction processing failed:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Transaction processing failed' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
