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

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('Token de autorização não fornecido');
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Usuário não autorizado');
    }

    const { productId } = await req.json();

    if (!productId) {
      throw new Error('productId é obrigatório');
    }

    // Verificar se o produto pertence ao usuário
    const { data: product, error: productError } = await serviceClient
      .from('products')
      .select('*, cover_image_url, checkout_image_url')
      .eq('id', productId)
      .eq('producer_id', user.id)
      .single();

    if (productError || !product) {
      throw new Error('Produto não encontrado ou você não tem permissão para excluí-lo');
    }

    console.log(`🗑️ Iniciando exclusão completa do produto: ${product.name}`);

    // 1. Buscar e deletar todos os spaces relacionados
    const { data: spaces, error: spacesError } = await serviceClient
      .from('spaces')
      .select('id, banner_image_url')
      .eq('product_id', productId);

    if (spacesError) {
      console.error('Erro ao buscar spaces:', spacesError);
    }

    if (spaces && spaces.length > 0) {
      console.log(`📁 Encontrados ${spaces.length} spaces para deletar`);
      
      for (const space of spaces) {
        // Deletar lesson_progress das aulas dos modules dos produtos deste space
        const { error: progressError } = await serviceClient
          .from('lesson_progress')
          .delete()
          .in('lesson_id', 
            serviceClient
              .from('lessons')
              .select('id')
              .in('module_id',
                serviceClient
                  .from('modules')
                  .select('id')
                  .eq('product_id', productId)
              )
          );

        if (progressError) {
          console.error('Erro ao deletar lesson_progress:', progressError);
        }

        // Deletar lessons
        const { error: lessonsError } = await serviceClient
          .from('lessons')
          .delete()
          .in('module_id',
            serviceClient
              .from('modules')
              .select('id')
              .eq('product_id', productId)
          );

        if (lessonsError) {
          console.error('Erro ao deletar lessons:', lessonsError);
        }

        // Deletar modules
        const { error: modulesError } = await serviceClient
          .from('modules')
          .delete()
          .eq('product_id', productId);

        if (modulesError) {
          console.error('Erro ao deletar modules:', modulesError);
        }

        // Deletar space_products
        const { error: spaceProductsError } = await serviceClient
          .from('space_products')
          .delete()
          .eq('space_id', space.id);

        if (spaceProductsError) {
          console.error('Erro ao deletar space_products:', spaceProductsError);
        }

        // Deletar space_containers
        const { error: containersError } = await serviceClient
          .from('space_containers')
          .delete()
          .eq('space_id', space.id);

        if (containersError) {
          console.error('Erro ao deletar space_containers:', containersError);
        }

        // Deletar cohorts
        const { error: cohortsError } = await serviceClient
          .from('cohorts')
          .delete()
          .eq('space_id', space.id);

        if (cohortsError) {
          console.error('Erro ao deletar cohorts:', cohortsError);
        }

        // Remover imagem do banner do space se existir
        if (space.banner_image_url) {
          try {
            const bannerPath = space.banner_image_url.split('/').pop();
            if (bannerPath) {
              await serviceClient.storage
                .from('uploads')
                .remove([bannerPath]);
              console.log(`🖼️ Banner do space removido: ${bannerPath}`);
            }
          } catch (storageError) {
            console.error('Erro ao remover banner do space:', storageError);
          }
        }

        // Deletar o space
        const { error: spaceError } = await serviceClient
          .from('spaces')
          .delete()
          .eq('id', space.id);

        if (spaceError) {
          console.error('Erro ao deletar space:', spaceError);
        } else {
          console.log(`✅ Space ${space.id} deletado com sucesso`);
        }
      }
    }

    // 2. Deletar enrollments
    const { error: enrollmentsError } = await serviceClient
      .from('enrollments')
      .delete()
      .eq('product_id', productId);

    if (enrollmentsError) {
      console.error('Erro ao deletar enrollments:', enrollmentsError);
    } else {
      console.log('✅ Enrollments deletados');
    }

    // 3. Deletar sales
    const { error: salesError } = await serviceClient
      .from('sales')
      .delete()
      .eq('product_id', productId);

    if (salesError) {
      console.error('Erro ao deletar sales:', salesError);
    } else {
      console.log('✅ Sales deletados');
    }

    // 4. Remover imagens do storage
    const imagesToRemove = [];
    
    if (product.cover_image_url) {
      const coverPath = product.cover_image_url.split('/').pop();
      if (coverPath) imagesToRemove.push(coverPath);
    }
    
    if (product.checkout_image_url) {
      const checkoutPath = product.checkout_image_url.split('/').pop();
      if (checkoutPath) imagesToRemove.push(checkoutPath);
    }

    if (imagesToRemove.length > 0) {
      try {
        const { error: storageError } = await serviceClient.storage
          .from('product-covers')
          .remove(imagesToRemove);

        if (storageError) {
          console.error('Erro ao remover imagens:', storageError);
        } else {
          console.log(`🖼️ ${imagesToRemove.length} imagens removidas do storage`);
        }

        // Também tentar remover do bucket uploads (caso esteja lá)
        await serviceClient.storage
          .from('uploads')
          .remove(imagesToRemove);
      } catch (storageError) {
        console.error('Erro ao remover imagens do storage:', storageError);
      }
    }

    // 5. Por fim, deletar o produto
    const { error: productDeleteError } = await serviceClient
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('producer_id', user.id);

    if (productDeleteError) {
      throw new Error(`Falha ao deletar o produto: ${productDeleteError.message}`);
    }

    console.log('✅ Produto deletado completamente do sistema');

    return new Response(JSON.stringify({ 
      message: 'Produto excluído completamente com sucesso',
      deleted_spaces: spaces?.length || 0,
      deleted_images: imagesToRemove.length
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