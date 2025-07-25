import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Invalid token:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('User authenticated:', user.id)

    // Parse request body for filters
    const { date_filter = 'last_30_days', product_id } = await req.json()
    console.log('Producer report filters:', { date_filter, product_id, user_id: user.id })

    // Calculate date range
    const endDate = new Date()
    let startDate = new Date()
    
    if (date_filter === 'last_7_days') {
      startDate.setDate(startDate.getDate() - 7)
    } else if (date_filter === 'last_30_days') {
      startDate.setDate(startDate.getDate() - 30)
    } else if (date_filter === 'this_year') {
      startDate = new Date(startDate.getFullYear(), 0, 1)
    } else if (date_filter && date_filter.includes('to')) {
      const [start, end] = date_filter.split(' to ')
      startDate = new Date(start)
      endDate.setTime(new Date(end).getTime())
    }

    console.log('Date range calculated:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() })

    // Call the PostgreSQL function
    const { data: reportData, error: reportError } = await supabaseClient
      .rpc('get_producer_financial_report', {
        p_producer_id: user.id,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

    if (reportError) {
      console.error('Error calling get_producer_financial_report:', reportError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch producer report' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Producer report data fetched successfully:', {
      kpis: reportData?.kpis || {},
      balances: reportData?.balances || {},
      chartDataPoints: reportData?.chartData?.length || 0,
      recentTransactionsCount: reportData?.recentTransactions?.length || 0,
      salesHistoryCount: reportData?.salesHistory?.length || 0
    })

    return new Response(
      JSON.stringify(reportData),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in get-producer-report function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})