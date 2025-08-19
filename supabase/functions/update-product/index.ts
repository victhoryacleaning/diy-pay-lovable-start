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

    // Obter o ID do usuário a partir do token de autorização
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { productId, productData } = await req.json();

    if (!productId) {
      throw new Error('productId é obrigatório.');
    }

    // Atualiza o produto, garantindo que o produtor só possa editar seus próprios produtos
    const { data: updatedProduct, error } = await serviceClient
      .from('products')
      .update(productData)
      .eq('id', productId)
      .eq('producer_id', user.id) // Cláusula de segurança crucial
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar produto:', error);
      throw new Error('Falha ao atualizar o produto. Verifique se o produto pertence a você.');
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