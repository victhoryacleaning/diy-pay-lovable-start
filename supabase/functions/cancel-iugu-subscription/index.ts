
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[DEBUG] *** INÍCIO DA FUNÇÃO cancel-iugu-subscription ***')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('[ERROR] Header de autorização não encontrado')
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Set the auth context
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.log('[ERROR] Erro de autenticação:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('[DEBUG] Usuário autenticado:', user.id)

    // Get producer profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'producer') {
      console.log('[ERROR] Usuário não é um produtor válido')
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get request data
    const { subscriptionId, saleId } = await req.json()

    if (!subscriptionId || !saleId) {
      console.log('[ERROR] Dados obrigatórios não fornecidos')
      return new Response(
        JSON.stringify({ error: 'subscriptionId and saleId are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('[DEBUG] Cancelando assinatura:', { subscriptionId, saleId })

    // Verify the sale belongs to this producer
    const { data: sale, error: saleError } = await supabaseClient
      .from('sales')
      .select(`
        *,
        products!inner(
          id,
          producer_id
        )
      `)
      .eq('id', saleId)
      .eq('iugu_subscription_id', subscriptionId)
      .eq('products.producer_id', profile.id)
      .single()

    if (saleError || !sale) {
      console.log('[ERROR] Assinatura não encontrada ou não pertence ao produtor')
      return new Response(
        JSON.stringify({ error: 'Subscription not found or access denied' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get Iugu API credentials
    const iuguApiKey = Deno.env.get('APP_ENV') === 'production' 
      ? Deno.env.get('IUGU_API_KEY_LIVE') 
      : Deno.env.get('IUGU_API_KEY_TEST')

    if (!iuguApiKey) {
      console.log('[ERROR] Chave da API da Iugu não configurada')
      return new Response(
        JSON.stringify({ error: 'Iugu API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Cancel subscription in Iugu
    console.log('[DEBUG] Fazendo chamada para cancelar assinatura na Iugu')
    
    const iuguResponse = await fetch(
      `https://api.iugu.com/v1/subscriptions/${subscriptionId}/suspend`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(iuguApiKey + ':')}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!iuguResponse.ok) {
      const errorText = await iuguResponse.text()
      console.log('[ERROR] Erro ao cancelar assinatura na Iugu:', iuguResponse.status, errorText)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to cancel subscription in Iugu',
          details: errorText
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const iuguData = await iuguResponse.json()
    console.log('[DEBUG] Assinatura cancelada com sucesso na Iugu:', iuguData)

    // Note: We don't update the status here because Iugu will send a webhook
    // (subscription.canceled) that our webhook handler will process

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription cancellation requested successfully',
        iugu_data: iuguData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.log('[ERROR] Erro interno:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
