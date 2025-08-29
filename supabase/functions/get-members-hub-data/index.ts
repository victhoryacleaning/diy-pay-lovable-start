import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { space_id } = await req.json();
    if (!space_id) throw new Error('space_id é obrigatório.');

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    // Busca os dados do space e produtos associados
    const { data: spaceData, error } = await serviceClient
      .from('spaces')
      .select(`
        name,
        banner_image_url,
        background_color,
        space_products (
          container_id,
          container_title,
          display_order,
          product:products (
            id,
            name,
            checkout_image_url
          )
        )
      `)
      .eq('id', space_id)
      .order('display_order', { referencedTable: 'space_products', ascending: true })
      .single();

    if (error) throw error;
    if (!spaceData) throw new Error('Área de membros não encontrada.');

    // Agrupa produtos por container
    const containersMap = new Map();
    
    spaceData.space_products.forEach((spaceProduct) => {
      const containerId = spaceProduct.container_id || 'default';
      const containerTitle = spaceProduct.container_title || 'Produtos';
      
      if (!containersMap.has(containerId)) {
        containersMap.set(containerId, {
          id: containerId,
          title: containerTitle,
          display_order: spaceProduct.display_order,
          space_products: []
        });
      }
      
      containersMap.get(containerId).space_products.push({
        product: spaceProduct.product
      });
    });

    // Converte o Map para array e ordena por display_order
    const space_containers = Array.from(containersMap.values())
      .sort((a, b) => a.display_order - b.display_order);

    const responseData = {
      name: spaceData.name,
      banner_image_url: spaceData.banner_image_url,
      background_color: spaceData.background_color,
      space_containers
    };

    return new Response(JSON.stringify(responseData), {
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