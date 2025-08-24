// Conteúdo completo e corrigido para supabase/functions/get-my-courses/index.ts

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

    // ### INÍCIO DA CORREÇÃO ###
    const { data, error } = await serviceClient
      .from('enrollments')
      .select(`
        product:products (
          id,
          name,
          cover_image_url,
          producer:profiles (full_name),
          space_products(space_id) 
        )
      `)
      // .eq('product.is_active', true) // Opcional: Descomente se quiser mostrar apenas produtos ativos
      .eq('user_id', user.id);
    // ### FIM DA CORREÇÃO ###

    if (error) throw error;
    
    // Simplifica a estrutura dos dados para o frontend
    const courses = data.map(enrollment => {
      // Se enrollment ou product for nulo, pula este item para evitar erros
      if (!enrollment.product) {
        return null;
      }

      // Garante que o space_id seja extraído corretamente
      const spaceId = enrollment.product.space_products && enrollment.product.space_products.length > 0
        ? enrollment.product.space_products[0].space_id
        : null;

      // Remove o objeto aninhado para limpar a resposta
      delete enrollment.product.space_products;
      
      const producerName = enrollment.product.producer 
        ? (enrollment.product.producer as { full_name: string }).full_name 
        : 'Produtor não encontrado';

      return {
        ...enrollment.product,
        producer_name: producerName,
        space_id: spaceId, // Adiciona o space_id ao objeto final (pode ser null)
      };
    }).filter(course => course !== null); // Remove quaisquer matrículas de produtos que foram deletados

    return new Response(JSON.stringify(courses), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Retornar 500 para erros internos do servidor
    });
  }
})
