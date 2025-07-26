import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set the auth context for the client
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const producerId = user.id;
    console.log('Fetching financials for producer:', producerId);

    // Get producer's products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('producer_id', producerId);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch producer products' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!products || products.length === 0) {
      console.log('No products found for producer');
      return new Response(
        JSON.stringify({ 
          data: {
            availableBalance: 0,
            pendingBalance: 0,
            transactions: []
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const productIds = products.map(p => p.id);
    console.log('Found products:', productIds.length);

    // Calculate balances based on sales
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select(`
        id,
        created_at,
        status,
        amount_total_cents,
        platform_fee_cents,
        producer_share_cents,
        release_date,
        product_id,
        buyer_email,
        products!inner(name)
      `)
      .in('product_id', productIds)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sales data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate balances
    const today = new Date();
    let availableBalance = 0;
    let pendingBalance = 0;

    sales?.forEach(sale => {
      const releaseDate = sale.release_date ? new Date(sale.release_date) : new Date(sale.created_at);
      
      if (releaseDate <= today) {
        availableBalance += sale.producer_share_cents;
      } else {
        pendingBalance += sale.producer_share_cents;
      }
    });

    // Get last 50 transactions for financial statement
    const transactionsSales = sales?.slice(0, 50).map(sale => ({
      id: sale.id,
      created_at: sale.created_at,
      status: sale.status,
      product_name: sale.products.name,
      amount_total_cents: sale.amount_total_cents,
      platform_fee_cents: sale.platform_fee_cents,
      producer_share_cents: sale.producer_share_cents,
      buyer_email: sale.buyer_email
    })) || [];

    const result = {
      availableBalance,
      pendingBalance,
      transactions: transactionsSales
    };

    console.log('Financial data calculated:', {
      availableBalance,
      pendingBalance,
      transactionsCount: transactionsSales.length
    });

    return new Response(
      JSON.stringify({ data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-producer-financials:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});