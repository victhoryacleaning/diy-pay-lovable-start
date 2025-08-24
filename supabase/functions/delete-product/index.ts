import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Helper para extrair o caminho do arquivo do storage a partir de uma URL completa
const getPathFromUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    const { pathname } = new URL(url);
    // Remove o '/object/public/' inicial do caminho
    const path = pathname.split('/').slice(4).join('/');
    return path;
  } catch (error) {
    console.error('URL inválida para extração de caminho:', url);
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('Token de autorização não fornecido');

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) throw new Error('Usuário não autorizado');

    const { productId } = await req.json();
    if (!productId) throw new Error('productId é obrigatório');

    // 1. Verificar permissão e buscar URLs das imagens
    const { data: product, error: productError } = await serviceClient
      .from('products')
      .select('producer_id, cover_image_url, checkout_image_url')
      .eq('id', productId)
      .eq('producer_id', user.id)
      .single();

    if (productError || !product) {
      throw new Error('Produto não encontrado ou você não tem permissão para excluí-lo');
    }

    console.log(`🗑️ Iniciando exclusão do produto: ${productId}`);

    // 2. Remover imagens do Storage (isso NUNCA é cascateado)
    const filesToDelete: { bucket: string; path: string | null }[] = [
      { bucket: 'product-covers', path: getPathFromUrl(product.cover_image_url) },
      { bucket: 'product-checkout-images', path: getPathFromUrl(product.checkout_image_url) },
      // Adicione aqui outros buckets/imagens se necessário
    ];
    
    let imagesDeletedCount = 0;
    for (const file of filesToDelete) {
      if (file.path) {
        const { error: storageError } = await serviceClient.storage
          .from(file.bucket)
          .remove([file.path]);
        
        if (storageError) {
          console.warn(`⚠️ Não foi possível remover o arquivo '${file.path}' do bucket '${file.bucket}':`, storageError.message);
        } else {
          console.log(`🖼️ Arquivo '${file.path}' removido do bucket '${file.bucket}'`);
          imagesDeletedCount++;
        }
      }
    }

    // 3. Deletar o produto do banco de dados. A CASCATA cuidará do resto.
    const { error: deleteError } = await serviceClient
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      throw new Error(`Falha ao deletar o produto no banco de dados: ${deleteError.message}`);
    }

    console.log('✅ Produto e dados associados excluídos com sucesso via cascata.');

    return new Response(JSON.stringify({
      message: 'Produto excluído completamente com sucesso',
      deleted_images: imagesDeletedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Erro na exclusão do produto:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});