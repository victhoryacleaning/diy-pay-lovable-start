import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { spaceId } = await req.json();
    if (!spaceId) throw new Error("ID do espaço é obrigatório.");

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ETAPA 1: Buscar os detalhes básicos do "Space"
    const { data: spaceDetails, error: spaceError } = await serviceClient
      .from('spaces')
      .select('id, name, slug')
      .eq('id', spaceId)
      .single();
    if (spaceError) throw spaceError;

    // ETAPA 2: Encontrar o ID do Produto Principal
    const { data: principalSpaceProduct, error: principalError } = await serviceClient
      .from('space_products')
      .select('product_id')
      .eq('space_id', spaceId)
      .eq('product_type', 'principal')
      .single();
    
    // Se não houver produto principal, retorna apenas os dados do space
    if (!principalSpaceProduct) {
      return new Response(JSON.stringify(spaceDetails), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // ETAPA 3: Buscar os detalhes completos do Produto Principal (incluindo Módulos e Aulas)
    const { data: productDetails, error: productError } = await serviceClient
      .from('products')
      .select(`
        id, name,
        modules (
          id, title, display_order,
          lessons (id, title, display_order, content_type)
        )
      `)
      .eq('id', principalSpaceProduct.product_id)
      .order('display_order', { referencedTable: 'modules', ascending: true })
      .order('display_order', { referencedTable: 'modules.lessons', ascending: true })
      .single();
    if (productError) throw productError;

    // ETAPA 4: Combinar os resultados
    const responseData = {
      ...spaceDetails,
      principal_product: productDetails,
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})