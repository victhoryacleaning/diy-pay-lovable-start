import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// FUNÇÃO DE DIAGNÓSTICO
async function createSpaceWithDefaultCohort(supabase: SupabaseClient, product: any, producerId: string) {
  // PASSO 1: Tenta criar o 'space'
  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .insert({ name: product.name, slug: product.checkout_link_slug, producer_id: producerId })
    .select()
    .single();

  if (spaceError) {
    // Se falhar aqui, lança um erro específico
    throw new Error(`[FALHA NO PASSO 1: CRIAR SPACE] --> ${spaceError.message}`);
  }

  // PASSO 2: Tenta vincular o produto ao 'space'
  const { error: spaceProductError } = await supabase
    .from('space_products')
    .insert({ space_id: space.id, product_id: product.id, product_type: 'principal' });

  if (spaceProductError) {
    // Se falhar aqui, lança um erro específico
    throw new Error(`[FALHA NO PASSO 2: VINCULAR PRODUTO] --> ${spaceProductError.message}`);
  }

  // PASSO 3: Tenta criar a 'cohort' (turma)
  const { error: cohortError } = await supabase
    .from('cohorts')
    .insert({ name: 'Turma 01', space_id: space.id, is_default: true, user_id: producerId });

  if (cohortError) {
    // Se falhar aqui, lança um erro específico
    throw new Error(`[FALHA NO PASSO 3: CRIAR TURMA] --> ${cohortError.message}`);
  }
  
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

    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert({ ...productData, producer_id: user.id })
      .select()
      .single();

    if (productError) throw productError;

    if (delivery_type === 'members_area') {
      await createSpaceWithDefaultCohort(supabase, newProduct, user.id);
    }

    return new Response(JSON.stringify(newProduct), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    // Retorna a mensagem de erro específica que a função de diagnóstico gerou
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
