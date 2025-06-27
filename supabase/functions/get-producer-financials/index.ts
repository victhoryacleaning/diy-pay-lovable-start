
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FinancialData {
  availableBalance: number;
  pendingBalance: number;
  securityReserveBalance: number;
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    type: 'credit' | 'fee' | 'withdrawal';
    amount: number;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a producer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'producer') {
      return new Response(
        JSON.stringify({ error: 'Access denied. Producer role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Calculate available balance (paid sales with release_date <= today)
    const { data: availableSales, error: availableError } = await supabase
      .from('sales')
      .select(`
        producer_share_cents,
        products!inner(producer_id)
      `)
      .eq('products.producer_id', user.id)
      .eq('status', 'paid')
      .lte('release_date', today);

    if (availableError) {
      console.error('Error fetching available sales:', availableError);
      return new Response(
        JSON.stringify({ error: 'Error calculating available balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const availableBalance = availableSales?.reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0) || 0;

    // Calculate pending balance (paid sales with release_date > today)
    const { data: pendingSales, error: pendingError } = await supabase
      .from('sales')
      .select(`
        producer_share_cents,
        products!inner(producer_id)
      `)
      .eq('products.producer_id', user.id)
      .eq('status', 'paid')
      .gt('release_date', today);

    if (pendingError) {
      console.error('Error fetching pending sales:', pendingError);
      return new Response(
        JSON.stringify({ error: 'Error calculating pending balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pendingBalance = pendingSales?.reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0) || 0;

    // Calculate security reserve balance (paid sales where paid_at + 30 days > today)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const { data: securityReserveSales, error: securityError } = await supabase
      .from('sales')
      .select(`
        security_reserve_cents,
        products!inner(producer_id)
      `)
      .eq('products.producer_id', user.id)
      .eq('status', 'paid')
      .gt('paid_at', thirtyDaysAgoStr);

    if (securityError) {
      console.error('Error fetching security reserve sales:', securityError);
      return new Response(
        JSON.stringify({ error: 'Error calculating security reserve balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const securityReserveBalance = securityReserveSales?.reduce((sum, sale) => sum + (sale.security_reserve_cents || 0), 0) || 0;

    // Get latest 50 transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('producer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedTransactions = transactions?.map(transaction => ({
      id: transaction.id,
      date: transaction.created_at,
      description: transaction.description,
      type: transaction.transaction_type,
      amount: transaction.amount_cents
    })) || [];

    const financialData: FinancialData = {
      availableBalance,
      pendingBalance,
      securityReserveBalance,
      transactions: formattedTransactions
    };

    return new Response(
      JSON.stringify(financialData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-producer-financials:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
