import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const token = req.headers.get('Authorization')!.replace('Bearer ', '')
    const { data: { user } } = await serviceClient.auth.getUser(token)
    if (!user) throw new Error('Unauthorized');

    const productDataWithDelivery = await req.json();
    const { delivery_type, ...productData } = productDataWithDelivery;

    // 1. Criar o produto
    const { data: newProduct, error: productError } = await serviceClient
      .from('products')
      .insert({ ...productData, producer_id: user.id })
      .select()
      .single();
    if (productError) throw productError;

    // 2. Se a entrega for via Área de Membros, criar o "Space" e a "Turma 01"
    if (delivery_type === 'members_area') {
      // 2a. Criar o Space
      const { data: newSpace, error: spaceError } = await serviceClient
        .from('spaces')
        .insert({
          producer_id: user.id,
          name: newProduct.name,
          slug: newProduct.checkout_link_slug,
          product_id: newProduct.id, // A PONTE SENDO CRIADA
        })
        .select('id')
        .single();
      if (spaceError) throw spaceError;

      // 2b. Vincular o produto ao novo space
      const { error: spaceProductError } = await serviceClient
        .from('space_products')
        .insert({
          space_id: newSpace.id,
          product_id: newProduct.id,
          product_type: 'principal',
        });
      if (spaceProductError) throw spaceProductError;

      // 2c. (NOVA LÓGICA) Criar a Turma 01 padrão e marcá-la como ativa
      const { error: cohortError } = await serviceClient
        .from('cohorts')
        .insert({
          space_id: newSpace.id,
          name: 'Turma 01',
          is_active: true, // Marcando como ativa
          user_id: user.id
        });
      if (cohortError) throw cohortError;
    }

    return new Response(JSON.stringify(newProduct), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})