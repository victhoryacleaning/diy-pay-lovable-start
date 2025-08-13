// supabase/functions/get-space-details/index.ts (VERSÃO CORRIGIDA)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { spaceId } = await req.json();
    if (!spaceId) throw new Error("ID do espaço é obrigatório.");

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data, error } = await serviceClient
      .from('spaces')
      .select(`
        id, name, slug,
        space_containers (id, title, display_order,
          space_products (product_type, display_order,
            product:products (id, name, checkout_image_url)
          )
        ),
        principal_product:space_products!inner(
          product:products!inner (
            id, name,
            modules (id, title, display_order,
              lessons (id, title, display_order, content_type)
            )
          )
        )
      `)
      .eq('id', spaceId)
      .eq('principal_product.product_type', 'principal')
      .order('display_order', { referencedTable: 'space_containers', ascending: true })
      .order('display_order', { referencedTable: 'space_containers.space_products', ascending: true })
      .single();

    if (error) throw error;
    
    // A query aninhada retorna uma estrutura complexa. Vamos simplificá-la.
    const responseData = {
      ...data,
      principal_product: data.principal_product[0]?.product,
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