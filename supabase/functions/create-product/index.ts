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

    // Validação do token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Header Authorization não encontrado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    
    if (!user) {
      throw new Error('Usuário não autorizado');
    }

    console.log('[DEBUG] Usuário autenticado:', user.id);

    const productDataWithDelivery = await req.json();
    const { delivery_type, ...productData } = productDataWithDelivery;

    console.log('[DEBUG] Dados recebidos:', {
      delivery_type,
      product_name: productData.name,
      checkout_link_slug: productData.checkout_link_slug
    });

    // 1. Criar o produto
    console.log('[DEBUG] Iniciando criação do produto...');
    const { data: newProduct, error: productError } = await serviceClient
      .from('products')
      .insert({ ...productData, producer_id: user.id })
      .select()
      .single();

    if (productError) {
      console.error('[ERRO PRODUTO]', JSON.stringify(productError, null, 2));
      throw new Error(`Erro ao criar produto: ${JSON.stringify(productError)}`);
    }

    console.log('[DEBUG] Produto criado com sucesso:', newProduct.id);

    // 2. Se a entrega for via Área de Membros...
    if (delivery_type === 'members_area') {
      console.log('[DEBUG] Iniciando criação da área de membros...');

      // Validação dos dados necessários
      if (!newProduct.name || !newProduct.checkout_link_slug) {
        throw new Error(`[VALIDAÇÃO] Produto deve ter name e checkout_link_slug. Recebido: name="${newProduct.name}", slug="${newProduct.checkout_link_slug}"`);
      }

      // a. Criar o "Space"
      console.log('[DEBUG] Criando space...');
      const { data: newSpace, error: spaceError } = await serviceClient
        .from('spaces')
        .insert({
          producer_id: user.id,
          name: newProduct.name,
          slug: newProduct.checkout_link_slug,
        })
        .select('id')
        .single();

      if (spaceError) {
        console.error('[ERRO SPACE]', JSON.stringify(spaceError, null, 2));
        throw new Error(`[FALHA AO CRIAR SPACE] --> ${JSON.stringify(spaceError)}`);
      }

      console.log('[DEBUG] Space criado com sucesso:', newSpace.id);

      // b. Vincular o produto ao novo space
      console.log('[DEBUG] Vinculando produto ao space...');
      const { error: spaceProductError } = await serviceClient
        .from('space_products')
        .insert({
          space_id: newSpace.id,
          product_id: newProduct.id,
          product_type: 'principal',
        });

      if (spaceProductError) {
        console.error('[ERRO SPACE_PRODUCT]', JSON.stringify(spaceProductError, null, 2));
        throw new Error(`[FALHA AO VINCULAR PRODUTO] --> ${JSON.stringify(spaceProductError)}`);
      }

      console.log('[DEBUG] Produto vinculado ao space com sucesso');

      // c. Criar a "Turma 01" padrão
      console.log('[DEBUG] Criando cohort padrão...');
      const { error: cohortError } = await serviceClient
        .from('cohorts')
        .insert({
          name: 'Turma 01',
          space_id: newSpace.id,
          is_default: true,
          user_id: user.id
        });

      if (cohortError) {
        console.error('[ERRO COHORT]', JSON.stringify(cohortError, null, 2));
        throw new Error(`[FALHA AO CRIAR TURMA] --> ${JSON.stringify(cohortError)}`);
      }

      console.log('[DEBUG] Cohort criada com sucesso');
    }

    console.log('[DEBUG] Processo completo finalizado com sucesso');

    return new Response(JSON.stringify(newProduct), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (error) {
    console.error('[ERRO GERAL]', error);
    console.error('[STACK TRACE]', error.stack);

    // Retornar erro detalhado para debug
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        // Para debug - você pode remover em produção se necessário
        stack: error.stack
      }),
      { 
        status: 400, // Mudei de 500 para 400 para ser consistente com seu código original
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
