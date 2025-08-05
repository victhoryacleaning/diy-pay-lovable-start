import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Função auxiliar para criar o espaço e a turma padrão
async function createSpaceWithDefaultCohort(supabase: SupabaseClient, product: any) {
  // 1. Criar o 'space'
  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .insert({
      name: product.name,
      slug: product.checkout_link_slug,
      producer_id: product.producer_id
    })
    .select()
    .single();

  if (spaceError) throw new Error(`Erro ao criar o espaço: ${spaceError.message}`);

  // 2. Vincula o produto ao novo space como "principal"
  const { error: spaceProductError } = await supabase
    .from('space_products')
    .insert({
      space_id: space.id,
      product_id: product.id,
      product_type: 'principal',
    });

  if (spaceProductError) throw new Error(`Erro ao vincular produto ao espaço: ${spaceProductError.message}`);

  // 3. Criar a 'cohort' (turma) padrão, já como ativa
  const { error: cohortError } = await supabase
    .from('cohorts')
    .insert({
      name: 'Turma 01',
      space_id: space.id,
      is_default: true,
      user_id: product.producer_id // <-- GARANTIR QUE ESTA LINHA SEJA ADICIONADA
    });

  if (cohortError) throw new Error(`Erro ao criar a turma padrão: ${cohortError.message}`);
  
  return { space };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const token = req.headers.get('Authorization')!.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) throw new Error('Unauthorized');

    const productDataWithDelivery = await req.json();
    const { delivery_type, ...productData } = productDataWithDelivery;

    // 1. Criar o produto principal
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert({ ...productData, producer_id: user.id })
      .select()
      .single();

    if (productError) throw productError;

    // 2. Se for um produto com área de membros, cria o espaço e a turma padrão
    if (delivery_type === 'members_area') {
      await createSpaceWithDefaultCohort(supabase, newProduct);
    }

    return new Response(JSON.stringify(newProduct), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})