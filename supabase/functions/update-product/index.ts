// supabase/functions/update-product/index.ts (VERSÃO FINAL E CORRIGIDA)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { productId, productData } = await req.json();

    if (!productId) {
      throw new Error('productId é obrigatório.');
    }

    // CORREÇÃO: Removido um nível de desestruturação desnecessário. 
    // A função agora usa 'productData' diretamente, que já vem limpo do frontend.
    const { data: updatedProduct, error } = await serviceClient
      .from('products')
      .update(productData)
      .eq('id', productId)
      .eq('producer_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar produto:', error);
      throw new Error(`Falha ao atualizar o produto: ${error.message}`);
    }

    return new Response(JSON.stringify(updatedProduct), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});