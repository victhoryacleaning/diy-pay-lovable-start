// supabase/functions/create-product/index.ts (VERSÃO CORRIGIDA)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');
    const { delivery_type, ...productData } = await req.json();

    const { data: newProduct, error: productError } = await serviceClient.from('products').insert({ ...productData, producer_id: user.id }).select().single();
    if (productError) throw productError;

    if (delivery_type === 'members_area') {
      const { data: newSpace, error: spaceError } = await serviceClient.from('spaces').insert({ producer_id: user.id, name: newProduct.name, slug: newProduct.checkout_link_slug }).select('id').single();
      if (spaceError) throw spaceError;

      // CRIA O CONTAINER PADRÃO "PRINCIPAL"
      const { data: newContainer, error: containerError } = await serviceClient.from('space_containers').insert({ space_id: newSpace.id, title: 'Principal', display_order: 0 }).select('id').single();
      if (containerError) throw containerError;

      // ASSOCIA O PRODUTO PRINCIPAL AO NOVO CONTAINER
      const { error: spError } = await serviceClient.from('space_products').insert({ space_id: newSpace.id, product_id: newProduct.id, product_type: 'principal', container_id: newContainer.id });
      if (spError) throw spError;

      const { error: cohortError } = await serviceClient.from('cohorts').insert({ space_id: newSpace.id, name: 'Turma 01', is_active: true });
      if (cohortError) throw cohortError;
    }
    return new Response(JSON.stringify(newProduct), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})