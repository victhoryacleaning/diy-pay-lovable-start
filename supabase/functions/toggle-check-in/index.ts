
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

    const { attendeeId, saleId } = await req.json()

    if (!attendeeId || !saleId) {
      throw new Error('attendeeId e saleId são obrigatórios')
    }

    console.log('[DEBUG] Alterando check-in para participante:', { attendeeId, saleId })

    // Get the sale with event attendees
    const { data: sale, error: saleError } = await supabaseClient
      .from('sales')
      .select('event_attendees')
      .eq('id', saleId)
      .single()

    if (saleError) {
      console.error('[ERROR] Erro ao buscar venda:', saleError)
      throw new Error('Venda não encontrada')
    }

    if (!sale.event_attendees || !Array.isArray(sale.event_attendees)) {
      throw new Error('Participantes não encontrados na venda')
    }

    // Find and update the specific attendee
    const updatedAttendees = sale.event_attendees.map((attendee: any) => {
      if (attendee.id === attendeeId) {
        const newCheckedIn = !attendee.checked_in
        return {
          ...attendee,
          checked_in: newCheckedIn,
          checked_in_at: newCheckedIn ? new Date().toISOString() : null
        }
      }
      return attendee
    })

    // Update the sale with the modified attendees
    const { error: updateError } = await supabaseClient
      .from('sales')
      .update({ event_attendees: updatedAttendees })
      .eq('id', saleId)

    if (updateError) {
      console.error('[ERROR] Erro ao atualizar check-in:', updateError)
      throw new Error('Erro ao atualizar check-in')
    }

    console.log('[DEBUG] Check-in atualizado com sucesso')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Check-in atualizado com sucesso'
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
