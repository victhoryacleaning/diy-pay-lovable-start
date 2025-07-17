import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9'
import { corsHeaders } from '../_shared/cors.ts'

console.log('get-producer-products function starting up')

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing request to get-producer-products')

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
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

    // Parse request body for pagination
    const body = await req.json()
    const { 
      page = 1,
      limit = 10
    } = body

    console.log('Pagination params:', { page, limit })

    // Calculate offset
    const offset = (page - 1) * limit

    // Get total count
    const { count: totalProducts, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('producer_id', user.id)

    if (countError) {
      console.error('Error counting products:', countError)
      return new Response(
        JSON.stringify({ error: 'Failed to count products' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get paginated products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('producer_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch products' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const hasMore = (totalProducts || 0) > offset + limit

    console.log('Products fetched successfully', {
      totalProducts: totalProducts || 0,
      productsCount: products?.length || 0,
      hasMore,
      page,
      limit
    })

    return new Response(
      JSON.stringify({
        products: products || [],
        totalProducts: totalProducts || 0,
        hasMore,
        currentPage: page,
        totalPages: Math.ceil((totalProducts || 0) / limit)
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in get-producer-products function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})