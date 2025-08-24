import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const authHeader = req.headers.get('Authorization')!
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado.");

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ETAPA 1: CORREÇÃO DA QUERY
    // Substituída a subquery manual pela sintaxe PostgREST para contagem.
    const { data, error } = await serviceClient
      .from('spaces')
      .select('id, name, slug, created_at, cover_image_url, space_products(count)')
      .eq('producer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // ETAPA 2: FORMATAÇÃO DA RESPOSTA
    // A nova query retorna a contagem aninhada. Formatamos para a estrutura que o frontend espera.
    const formattedData = data.map(space => ({
      id: space.id,
      name: space.name,
      slug: space.slug,
      created_at: space.created_at,
      cover_image_url: space.cover_image_url,
      product_count: space.space_products?.length || 0,
    }));

    return new Response(JSON.stringify(formattedData), {
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