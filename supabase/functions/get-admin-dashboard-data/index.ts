import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set auth header for supabase client
    const token = authHeader.replace('Bearer ', '');
    supabase.auth.setSession({ access_token: token, refresh_token: '' });

    // Verify user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Erro ao obter usuário:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.error('Erro ao verificar role ou usuário não é admin:', profileError);
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem acessar este endpoint.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin autenticado:', user.id);

    // Get request body
    const { date_filter = 'last_30_days' } = await req.json().catch(() => ({}));
    
    console.log('Filtro de data recebido:', date_filter);

    // Calculate date range based on filter
    let startDate: string;
    let endDate: string = new Date().toISOString();

    switch (date_filter) {
      case 'last_7_days':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'last_30_days':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'this_month':
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        break;
      case 'this_year':
        const year = new Date().getFullYear();
        startDate = new Date(year, 0, 1).toISOString();
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    console.log('Período de análise:', { startDate, endDate });

    // Calculate KPIs from sales data
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('amount_total_cents, platform_fee_cents, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', startDate)
      .lte('paid_at', endDate);

    if (salesError) {
      console.error('Erro ao buscar dados de vendas:', salesError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar dados de vendas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Vendas encontradas:', salesData?.length || 0);

    // Calculate total volume and profit
    const valorTotalMovimentado = salesData?.reduce((sum, sale) => sum + (sale.amount_total_cents || 0), 0) || 0;
    const valorTotalLucro = salesData?.reduce((sum, sale) => sum + (sale.platform_fee_cents || 0), 0) || 0;

    console.log('KPIs calculados:', { valorTotalMovimentado, valorTotalLucro });

    // Prepare chart data - group by date
    const chartDataMap = new Map<string, number>();
    
    salesData?.forEach(sale => {
      if (sale.paid_at) {
        const date = new Date(sale.paid_at);
        const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const currentValue = chartDataMap.get(dateKey) || 0;
        chartDataMap.set(dateKey, currentValue + (sale.amount_total_cents || 0));
      }
    });

    // Convert map to array and sort by date
    const chartData = Array.from(chartDataMap.entries())
      .map(([name, total]) => ({ name, total: total / 100 })) // Convert from cents to reais
      .sort((a, b) => {
        const [dayA, monthA] = a.name.split('/').map(Number);
        const [dayB, monthB] = b.name.split('/').map(Number);
        return monthA !== monthB ? monthA - monthB : dayA - dayB;
      });

    console.log('Dados do gráfico preparados:', chartData.length, 'pontos');

    const response = {
      kpis: {
        valorTotalMovimentado: Math.round(valorTotalMovimentado / 100), // Convert from cents to reais
        valorTotalLucro: Math.round(valorTotalLucro / 100), // Convert from cents to reais
      },
      chartData,
      periodo: { startDate, endDate },
      totalVendas: salesData?.length || 0
    };

    console.log('Resposta final:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na função get-admin-dashboard-data:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});