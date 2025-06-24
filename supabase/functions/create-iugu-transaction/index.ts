
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      sales: {
        Insert: {
          product_id: string
          buyer_email: string
          amount_total_cents: number
          platform_fee_cents: number
          producer_share_cents: number
          payment_method_used: string
          installments_chosen?: number
          event_attendees?: any
        }
      }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    console.log('[DEBUG] Body completo recebido:', JSON.stringify(requestBody, null, 2))

    // Extrair dados com fallbacks seguros
    const { 
      productId, 
      paymentMethod, 
      buyerEmail, 
      amount,
      donationAmount,
      quantity,
      eventAttendees,
      installments = 1
    } = requestBody

    console.log('[DEBUG] Dados extraídos:', { 
      productId, 
      paymentMethod, 
      buyerEmail, 
      amount, 
      donationAmount, 
      quantity, 
      eventAttendees: eventAttendees?.length || 0, 
      installments 
    })

    // Validação básica dos campos obrigatórios
    if (!productId) {
      console.error('[ERROR] productId é obrigatório')
      throw new Error('Product ID é obrigatório')
    }

    if (!paymentMethod) {
      console.error('[ERROR] paymentMethod é obrigatório')
      throw new Error('Método de pagamento é obrigatório')
    }

    if (!buyerEmail) {
      console.error('[ERROR] buyerEmail é obrigatório')
      throw new Error('Email do comprador é obrigatório')
    }

    // Get product details
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError) {
      console.error('[ERROR] Erro ao buscar produto:', productError)
      throw new Error('Produto não encontrado')
    }

    console.log('[DEBUG] Produto encontrado:', product)

    // Calcular valores finais baseado no tipo de produto
    let finalAmountCents = 0
    let processedEventAttendees = null

    if (product.product_type === 'event') {
      console.log('[DEBUG] Processando produto do tipo EVENT')
      
      if (!quantity || quantity <= 0) {
        throw new Error('Quantidade é obrigatória para eventos')
      }

      if (!eventAttendees || !Array.isArray(eventAttendees) || eventAttendees.length === 0) {
        throw new Error('Dados dos participantes são obrigatórios para eventos')
      }

      if (eventAttendees.length !== quantity) {
        throw new Error('Número de participantes deve corresponder à quantidade')
      }

      finalAmountCents = product.price_cents * quantity

      // Processar participantes com IDs únicos
      processedEventAttendees = eventAttendees.map((attendee: any) => ({
        id: crypto.randomUUID(),
        name: attendee.name,
        email: attendee.email,
        lote: attendee.lote || 'Primeiro Lote',
        checked_in: false,
        checked_in_at: null
      }))

      console.log('[DEBUG] Participantes processados:', processedEventAttendees.length)

    } else if (product.product_type === 'donation') {
      console.log('[DEBUG] Processando produto do tipo DONATION')
      
      if (!donationAmount || donationAmount <= 0) {
        throw new Error('Valor da doação é obrigatório para doações')
      }

      finalAmountCents = donationAmount

    } else {
      console.log('[DEBUG] Processando produto do tipo PADRÃO')
      
      if (!amount || amount <= 0) {
        throw new Error('Valor do produto é obrigatório')
      }

      finalAmountCents = amount
    }

    console.log('[DEBUG] Valor final calculado:', finalAmountCents)

    // Calculate fees (assuming 5% platform fee)
    const platformFeePercent = 0.05
    const platformFeeCents = Math.round(finalAmountCents * platformFeePercent)
    const producerShareCents = finalAmountCents - platformFeeCents

    console.log('[DEBUG] Taxas calculadas:', { platformFeeCents, producerShareCents })

    // Create sale record
    const { data: sale, error: saleError } = await supabaseClient
      .from('sales')
      .insert({
        product_id: productId,
        buyer_email: buyerEmail,
        amount_total_cents: finalAmountCents,
        platform_fee_cents: platformFeeCents,
        producer_share_cents: producerShareCents,
        payment_method_used: paymentMethod,
        installments_chosen: installments,
        event_attendees: processedEventAttendees
      })
      .select()
      .single()

    if (saleError) {
      console.error('[ERROR] Erro ao criar venda:', saleError)
      throw new Error('Erro ao processar pagamento')
    }

    console.log('[DEBUG] Venda criada com sucesso:', sale.id)

    // Mock payment processing (in real implementation, integrate with payment provider)
    const mockPaymentResult = {
      success: true,
      transactionId: `mock_${Date.now()}`,
      status: 'pending'
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sale,
        payment: mockPaymentResult
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('[ERROR] Erro geral:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
