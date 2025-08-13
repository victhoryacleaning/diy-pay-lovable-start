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

    // 1. Criar o Produto
    const { data: newProduct, error: productError } = await serviceClient.from('products').insert({ ...productData, producer_id: user.id }).select().single();
    if (productError) throw productError;

    if (delivery_type === 'members_area') {
      // 2. Criar o Space
      const { data: newSpace, error: spaceError } = await serviceClient.from('spaces').insert({ producer_id: user.id, name: newProduct.name, slug: newProduct.checkout_link_slug }).select('id').single();
      if (spaceError) throw spaceError;

      // 3. Criar o Container Padrão
      const { data: newContainer, error: containerError } = await serviceClient.from('space_containers').insert({ space_id: newSpace.id, title: 'Sejam bem-vindos', display_order: 0 }).select('id').single();
      if (containerError) throw containerError;

      // 4. Associar o Produto Principal ao Container
      const { error: spError } = await serviceClient.from('space_products').insert({ space_id: newSpace.id, product_id: newProduct.id, product_type: 'principal', container_id: newContainer.id });
      if (spError) throw spError;

      // 5. Criar a Turma Padrão
      const { data: newCohort, error: cohortError } = await serviceClient.from('cohorts').insert({ space_id: newSpace.id, name: 'Turma 01', is_active: true }).select('id').single();
      if (cohortError) throw cohortError;

      // 6. (NOVO) Criar o Módulo Padrão
      const { data: newModule, error: moduleError } = await serviceClient.from('modules').insert({ product_id: newProduct.id, title: 'Bem-vindo', display_order: 0 }).select('id').single();
      if (moduleError) throw moduleError;

      // 7. (NOVO) Criar a Aula Padrão
      const { error: lessonError } = await serviceClient.from('lessons').insert({
        module_id: newModule.id,
        title: 'Aula demonstração',
        content_type: 'video',
        content_url: 'https://www.youtube.com/watch?v=5mGuCdlCcNM',
        display_order: 0,
      });
      if (lessonError) throw lessonError;

      // 8. (NOVO E CRUCIAL) Matricular o Produtor como o primeiro aluno
      const { error: enrollmentError } = await serviceClient.from('enrollments').insert({
        user_id: user.id,
        product_id: newProduct.id,
        cohort_id: newCohort.id,
      });
      if (enrollmentError) {
        // Log o erro, mas não quebre a criação do produto se a matrícula falhar
        console.error(`Falha ao auto-matricular produtor: ${enrollmentError.message}`);
      }
    }
    
    return new Response(JSON.stringify(newProduct), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})