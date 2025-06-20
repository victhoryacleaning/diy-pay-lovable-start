
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const productId = url.searchParams.get('productId')

    if (!productId) {
      throw new Error('Product ID é obrigatório')
    }

    console.log('[DEBUG] Buscando participantes para o produto:', productId)

    // Get all sales for this product that have event attendees
    const { data: sales, error: salesError } = await supabaseClient
      .from('sales')
      .select('id, event_attendees, created_at, buyer_email, status')
      .eq('product_id', productId)
      .not('event_attendees', 'is', null)

    if (salesError) {
      console.error('[ERROR] Erro ao buscar vendas:', salesError)
      throw new Error('Erro ao buscar participantes')
    }

    console.log('[DEBUG] Vendas encontradas:', sales?.length)

    // Flatten all attendees from all sales
    const allAttendees: any[] = []
    
    if (sales) {
      sales.forEach(sale => {
        if (sale.event_attendees && Array.isArray(sale.event_attendees)) {
          sale.event_attendees.forEach((attendee: any) => {
            allAttendees.push({
              ...attendee,
              saleId: sale.id,
              saleDate: sale.created_at,
              buyerEmail: sale.buyer_email,
              saleStatus: sale.status
            })
          })
        }
      })
    }

    console.log('[DEBUG] Total de participantes encontrados:', allAttendees.length)

    return new Response(
      JSON.stringify({ 
        success: true, 
        attendees: allAttendees
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
