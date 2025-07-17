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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body for filters
    const { date_filter, product_id } = await req.json()
    console.log('Dashboard v2 filters:', { date_filter, product_id, user_id: user.id })

    // Get producer's products
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, name')
      .eq('producer_id', user.id)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      throw productsError
    }

    const productIds = products?.map(p => p.id) || []
    
    if (productIds.length === 0) {
      return new Response(
        JSON.stringify({
          kpiValorLiquido: 0,
          kpiVendasCount: 0,
          kpiReembolso: 0,
          chartData: [],
          recentTransactions: [],
          saldoDisponivel: 0,
          saldoPendente: 0,
          products: []
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse date filter
    let startDate = new Date()
    let endDate = new Date()
    
    if (date_filter) {
      if (date_filter === 'last_7_days') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (date_filter === 'last_30_days') {
        startDate.setDate(startDate.getDate() - 30)
      } else if (date_filter === 'this_year') {
        startDate = new Date(startDate.getFullYear(), 0, 1)
      } else if (date_filter.includes('to')) {
        // Handle date range "YYYY-MM-DD to YYYY-MM-DD"
        const [start, end] = date_filter.split(' to ')
        startDate = new Date(start)
        endDate = new Date(end)
      }
    } else {
      // Default to last 30 days
      startDate.setDate(startDate.getDate() - 30)
    }

    // Build query filters
    let productFilter = productIds
    if (product_id && product_id !== 'all') {
      productFilter = [product_id]
    }

    // DYNAMIC DATA (affected by filters)
    
    // 1. KPI Valor Líquido (paid sales within date range)
    const { data: valorLiquidoData, error: valorError } = await supabaseClient
      .from('sales')
      .select('producer_share_cents')
      .in('product_id', productFilter)
      .eq('status', 'paid')
      .gte('paid_at', startDate.toISOString())
      .lte('paid_at', endDate.toISOString())

    const kpiValorLiquido = valorLiquidoData?.reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0) || 0

    // 2. KPI Vendas Count
    const { data: vendasCountData, error: vendasError } = await supabaseClient
      .from('sales')
      .select('id')
      .in('product_id', productFilter)
      .eq('status', 'paid')
      .gte('paid_at', startDate.toISOString())
      .lte('paid_at', endDate.toISOString())

    const kpiVendasCount = vendasCountData?.length || 0

    // 3. KPI Reembolso
    const { data: reembolsoData, error: reembolsoError } = await supabaseClient
      .from('sales')
      .select('amount_total_cents')
      .in('product_id', productFilter)
      .eq('status', 'refunded')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const kpiReembolso = reembolsoData?.reduce((sum, sale) => sum + (sale.amount_total_cents || 0), 0) || 0

    // 4. Chart Data (daily sales within period)
    const { data: chartSalesData, error: chartError } = await supabaseClient
      .from('sales')
      .select('paid_at, producer_share_cents')
      .in('product_id', productFilter)
      .eq('status', 'paid')
      .gte('paid_at', startDate.toISOString())
      .lte('paid_at', endDate.toISOString())
      .order('paid_at', { ascending: true })

    // Group sales by date for chart
    const salesByDate = new Map()
    chartSalesData?.forEach(sale => {
      if (sale.paid_at) {
        const date = new Date(sale.paid_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        const current = salesByDate.get(date) || 0
        salesByDate.set(date, current + (sale.producer_share_cents || 0))
      }
    })

    const chartData = Array.from(salesByDate.entries()).map(([name, total]) => ({
      name,
      total: total / 100 // Convert to BRL
    }))

    // 5. Recent Transactions (last 5, can filter by product)
    const { data: recentSales, error: recentError } = await supabaseClient
      .from('sales')
      .select(`
        id,
        buyer_email,
        amount_total_cents,
        created_at,
        status,
        products!inner(name)
      `)
      .in('product_id', productFilter)
      .in('status', ['paid', 'pending_payment'])
      .order('created_at', { ascending: false })
      .limit(5)

    const recentTransactions = recentSales?.map(sale => ({
      id: sale.id,
      buyer_email: sale.buyer_email,
      product_name: (sale.products as any)?.name || 'Produto',
      amount: sale.amount_total_cents,
      created_at: sale.created_at || '',
      status: sale.status
    })) || []

    // STATIC DATA (not affected by filters)
    
    const today = new Date().toISOString().split('T')[0]

    // Saldo Disponível
    const { data: availableBalanceData, error: availableError } = await supabaseClient
      .from('sales')
      .select('producer_share_cents')
      .in('product_id', productIds)
      .eq('payout_status', 'pending')
      .lte('release_date', today)
      .not('producer_share_cents', 'is', null)

    const saldoDisponivel = availableBalanceData?.reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0) || 0

    // Saldo Pendente
    const { data: pendingBalanceData, error: pendingError } = await supabaseClient
      .from('sales')
      .select('producer_share_cents')
      .in('product_id', productIds)
      .eq('payout_status', 'pending')
      .gt('release_date', today)
      .not('producer_share_cents', 'is', null)

    const saldoPendente = pendingBalanceData?.reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0) || 0

    // Calculate milestone data for progress bar
    const getTotalRevenue = async () => {
      const { data: totalRevenueData } = await supabaseClient
        .from('sales')
        .select('producer_share_cents')
        .in('product_id', productIds)
        .eq('status', 'paid')
        .not('producer_share_cents', 'is', null)
      
      return totalRevenueData?.reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0) || 0
    }

    const totalRevenue = await getTotalRevenue()
    
    // Define milestones (in cents)
    const milestones = [1000000, 10000000, 100000000] // 10K, 100K, 1M
    
    let currentMilestone = milestones[0]
    let progressPercentage = 0
    
    // Find current milestone
    for (let i = 0; i < milestones.length; i++) {
      if (totalRevenue < milestones[i]) {
        currentMilestone = milestones[i]
        progressPercentage = Math.min((totalRevenue / milestones[i]) * 100, 100)
        break
      } else if (i === milestones.length - 1) {
        // Exceeded all milestones
        currentMilestone = milestones[i]
        progressPercentage = 100
      }
    }

    const dashboardData = {
      // Dynamic data
      kpiValorLiquido,
      kpiVendasCount,
      kpiReembolso,
      chartData,
      recentTransactions,
      // Static data
      saldoDisponivel,
      saldoPendente,
      // Milestone data
      currentRevenue: totalRevenue,
      currentMilestone,
      progressPercentage,
      // Products for filter
      products: products?.map(p => ({ id: p.id, name: p.name })) || []
    }

    console.log('Dashboard v2 data calculated:', {
      kpiValorLiquido,
      kpiVendasCount,
      kpiReembolso,
      chartDataPoints: chartData.length,
      recentTransactionsCount: recentTransactions.length,
      saldoDisponivel,
      saldoPendente
    })

    return new Response(
      JSON.stringify(dashboardData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in get-producer-dashboard-v2:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})