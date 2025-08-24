import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { space_id } = await req.json();
    if (!space_id) throw new Error('space_id é obrigatório.');

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    // Busca os dados do space e seus containers com produtos associados
    const { data: spaceData, error } = await serviceClient
      .from('spaces')
      .select(`
        name,
        banner_image_url,
        background_color,
        space_containers (
          id,
          title,
          display_order,
          space_products (
            product:products (
              id,
              name,
              checkout_image_url
            )
          )
        )
      `)
      .eq('id', space_id)
      .order('display_order', { referencedTable: 'space_containers', ascending: true })
      .single();

    if (error) throw error;
    if (!spaceData) throw new Error('Área de membros não encontrada.');

    return new Response(JSON.stringify(spaceData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})