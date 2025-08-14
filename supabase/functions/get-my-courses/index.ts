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
    
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data, error } = await serviceClient
      .from('enrollments')
      .select(`
        product:products (
          id,
          name,
          checkout_image_url,
          producer:profiles (full_name),
          space_products!inner(space_id) 
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;
    
    // Simplifica a estrutura dos dados para o frontend
    const courses = data.map(enrollment => {
      // Garante que o space_id seja extraído corretamente
      const spaceId = enrollment.product.space_products && enrollment.product.space_products.length > 0
        ? enrollment.product.space_products[0].space_id
        : null;

      // Remove o objeto aninhado para limpar a resposta
      delete enrollment.product.space_products;

      return {
        ...enrollment.product,
        producer_name: enrollment.product.producer.full_name,
        space_id: spaceId, // Adiciona o space_id ao objeto final
      };
    }).filter(course => course.space_id !== null); // Garante que apenas cursos com um hub sejam mostrados

    return new Response(JSON.stringify(courses), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})