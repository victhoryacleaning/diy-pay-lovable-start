import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { spaceId } = await req.json();
    if (!spaceId) throw new Error("ID do espaço é obrigatório.");

    // Usamos a chave de serviço para buscar dados, pois as RLS protegerão a edição.
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query aprimorada para buscar as aulas dentro dos módulos
    const { data: space, error } = await serviceClient
      .from('spaces')
      .select(`
        id, name, slug,
        space_products (
          product:products (
            id, name,
            modules (
              id, title, display_order,
              lessons (id, title, display_order, content_type)
            )
          )
        )
      `)
      .eq('id', spaceId)
      .eq('space_products.product_type', 'principal') // Garante que estamos pegando o produto principal
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(space), {
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