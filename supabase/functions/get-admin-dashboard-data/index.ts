import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Admin dashboard data request started')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '')
    
    // Set the auth token for this request
    supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.log('User error:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.log('Not admin user:', profileError)
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body for date filter
    const { date_filter = 'last_30_days' } = await req.json().catch(() => ({}))
    
    // Calculate date range based on filter
    let startDate = new Date()
    const endDate = new Date()
    
    switch (date_filter) {
      case 'this_month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
        break
      case 'this_year':
        startDate = new Date(endDate.getFullYear(), 0, 1)
        break
      case 'last_7_days':
        startDate.setDate(endDate.getDate() - 7)
        break
      case 'last_30_days':
      default:
        startDate.setDate(endDate.getDate() - 30)
        break
    }

    console.log(`Fetching data from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Get KPIs - total volume and platform profit
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('amount_total_cents, platform_fee_cents, created_at')
      .eq('status', 'paid')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (salesError) {
      console.log('Sales query error:', salesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sales data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate KPIs
    const valorTotalMovimentado = salesData?.reduce((sum, sale) => sum + (sale.amount_total_cents || 0), 0) || 0
    const valorTotalLucro = salesData?.reduce((sum, sale) => sum + (sale.platform_fee_cents || 0), 0) || 0

    // Generate chart data - daily aggregation
    const dailyData = new Map<string, number>()
    
    salesData?.forEach(sale => {
      const date = new Date(sale.created_at)
      const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`
      const currentValue = dailyData.get(dateKey) || 0
      dailyData.set(dateKey, currentValue + (sale.amount_total_cents || 0))
    })

    // Convert to array format for chart
    const chartData = Array.from(dailyData, ([name, total]) => ({
      name,
      total: total / 100 // Convert cents to reais
    })).sort((a, b) => {
      // Sort by date
      const [dayA, monthA] = a.name.split('/').map(Number)
      const [dayB, monthB] = b.name.split('/').map(Number)
      
      if (monthA !== monthB) return monthA - monthB
      return dayA - dayB
    })

    const response = {
      kpis: {
        valorTotalMovimentado: valorTotalMovimentado / 100, // Convert cents to reais
        valorTotalLucro: valorTotalLucro / 100 // Convert cents to reais
      },
      chartData
    }

    console.log('Admin dashboard data response:', response)

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-admin-dashboard-data:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})