
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

    const { 
      productId, 
      paymentMethod, 
      buyerEmail, 
      amount, 
      installments = 1,
      eventAttendees = []
    } = await req.json()

    console.log('[DEBUG] Dados recebidos:', { productId, paymentMethod, buyerEmail, amount, installments, eventAttendees })

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

    // Calculate fees (assuming 5% platform fee)
    const platformFeePercent = 0.05
    const platformFeeCents = Math.round(amount * platformFeePercent)
    const producerShareCents = amount - platformFeeCents

    // Process event attendees with unique IDs if it's an event
    let processedEventAttendees = null
    if (product.product_type === 'event' && eventAttendees.length > 0) {
      processedEventAttendees = eventAttendees.map((attendee: any) => ({
        id: crypto.randomUUID(),
        name: attendee.name,
        email: attendee.email,
        lote: attendee.lote || 'Primeiro Lote',
        checked_in: false,
        checked_in_at: null
      }))
      console.log('[DEBUG] Participantes processados:', processedEventAttendees)
    }

    // Create sale record
    const { data: sale, error: saleError } = await supabaseClient
      .from('sales')
      .insert({
        product_id: productId,
        buyer_email: buyerEmail,
        amount_total_cents: amount,
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

    console.log('[DEBUG] Venda criada:', sale)

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
