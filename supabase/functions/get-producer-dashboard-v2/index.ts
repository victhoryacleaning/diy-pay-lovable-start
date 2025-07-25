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
    const { date_filter = 'last_30_days', product_id } = await req.json()
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

    // Build query filters for products
    let productFilter = productIds
    if (product_id && product_id !== 'all') {
      productFilter = [product_id]
    }

    // 1. BUSCAR TODAS AS VENDAS PAGAS DO PRODUTOR
    const { data: allPaidSales, error: salesError } = await supabaseClient
      .from('sales')
      .select('amount_total_cents, platform_fee_cents, producer_share_cents, paid_at, release_date, status, created_at, id, buyer_email')
      .eq('status', 'paid')
      .in('product_id', productFilter)
      .not('producer_share_cents', 'is', null)

    if (salesError) {
      console.error('Error fetching sales:', salesError)
      throw salesError
    }

    console.log('Total paid sales found:', allPaidSales?.length || 0)

    // 2. LÓGICA DE FILTRO DE DATA (EM JAVASCRIPT)
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
      endDate = new Date(end)
    }
    
    const filteredSales = (allPaidSales || []).filter(sale => {
      if (!sale.paid_at) return false
      const saleDate = new Date(sale.paid_at)
      return saleDate >= startDate && saleDate <= endDate
    })

    console.log('Filtered sales for period:', filteredSales.length)

    // 3. CALCULAR KPIs DINÂMICOS (com base nas vendas filtradas)
    const kpiValorLiquido = filteredSales.reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0)
    const kpiVendasCount = filteredSales.length

    // KPI Reembolso - buscar vendas refunded no período
    const { data: refundedSales, error: refundError } = await supabaseClient
      .from('sales')
      .select('amount_total_cents, created_at')
      .eq('status', 'refunded')
      .in('product_id', productFilter)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const kpiReembolso = (refundedSales || []).reduce((sum, sale) => sum + (sale.amount_total_cents || 0), 0)

    // 4. CALCULAR SALDOS ESTÁTICOS (com base em TODAS as vendas pagas)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0) // Início do dia para comparação precisa
    
    let totalLiberado = 0
    let saldoFuturo = 0

    (allPaidSales || []).forEach(sale => {
      if (sale.release_date) {
        const releaseDate = new Date(sale.release_date)
        releaseDate.setHours(0, 0, 0, 0)
        
        if (releaseDate <= hoje) {
          totalLiberado += sale.producer_share_cents || 0
        } else {
          saldoFuturo += sale.producer_share_cents || 0
        }
      }
    })

    console.log('Balances calculated:', { totalLiberado, saldoFuturo })

    // 5. CALCULAR RESERVA DE SEGURANÇA
    const { data: producerSettings } = await supabaseClient
      .from('producer_settings')
      .select('custom_security_reserve_percent')
      .eq('producer_id', user.id)
      .maybeSingle()

    const { data: platformSettings } = await supabaseClient
      .from('platform_settings')
      .select('default_security_reserve_percent')
      .maybeSingle()

    const percentualReserva = (
      producerSettings?.custom_security_reserve_percent ?? 
      platformSettings?.default_security_reserve_percent ?? 
      5
    ) / 100

    const reservaDeSeguranca = Math.round(totalLiberado * percentualReserva)
    
    const saldoDisponivel = totalLiberado - reservaDeSeguranca
    const saldoPendente = saldoFuturo + reservaDeSeguranca

    console.log('Security reserve:', { percentualReserva: percentualReserva * 100, reservaDeSeguranca, saldoDisponivel, saldoPendente })

    // 6. PREPARAR DADOS DO GRÁFICO
    const salesByDate = new Map()
    filteredSales.forEach(sale => {
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

    // 7. TRANSAÇÕES RECENTES
    const { data: recentSalesData, error: recentError } = await supabaseClient
      .from('sales')
      .select(`
        id,
        buyer_email,
        amount_total_cents,
        producer_share_cents,
        created_at,
        status,
        products!inner(name)
      `)
      .in('product_id', productFilter)
      .in('status', ['paid', 'pending_payment'])
      .order('created_at', { ascending: false })
      .limit(5)

    const recentTransactions = (recentSalesData || []).map(sale => ({
      id: sale.id,
      buyer_email: sale.buyer_email,
      product_name: (sale.products as any)?.name || 'Produto',
      amount: sale.producer_share_cents || sale.amount_total_cents,
      created_at: sale.created_at || '',
      status: sale.status
    }))

    // 8. MILESTONE DATA
    const totalRevenue = (allPaidSales || []).reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0)
    const milestones = [1000000, 10000000, 100000000] // 10K, 100K, 1M
    
    let currentMilestone = milestones[0]
    let progressPercentage = 0
    
    for (let i = 0; i < milestones.length; i++) {
      if (totalRevenue < milestones[i]) {
        currentMilestone = milestones[i]
        progressPercentage = Math.min((totalRevenue / milestones[i]) * 100, 100)
        break
      } else if (i === milestones.length - 1) {
        currentMilestone = milestones[i]
        progressPercentage = 100
      }
    }

    // 9. RETORNAR RESPOSTA COMPLETA
    const dashboardData = {
      kpiValorLiquido,
      kpiVendasCount,
      kpiReembolso,
      chartData,
      recentTransactions,
      saldoDisponivel,
      saldoPendente,
      currentRevenue: totalRevenue,
      currentMilestone,
      progressPercentage,
      products: products?.map(p => ({ id: p.id, name: p.name })) || []
    }

    console.log('Dashboard v2 data calculated:', {
      kpiValorLiquido,
      kpiVendasCount,
      kpiReembolso,
      chartDataPoints: chartData.length,
      recentTransactionsCount: recentTransactions.length,
      saldoDisponivel,
      saldoPendente,
      totalRevenue
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