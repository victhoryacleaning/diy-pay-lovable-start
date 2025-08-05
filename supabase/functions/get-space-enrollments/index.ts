// supabase/functions/get-space-enrollments/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  console.log('--- [get-space-enrollments] Função iniciada ---');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const token = req.headers.get('Authorization')!.replace('Bearer ', '')
    const { data: { user } } = await serviceClient.auth.getUser(token)
    if (!user) throw new Error('Unauthorized');
    console.log(`--- Usuário autenticado: ${user.id} ---`);

    const { productId } = await req.json();
    if (!productId) throw new Error("ID do produto é obrigatório.");
    console.log(`--- Buscando alunos para o produto: ${productId} ---`);

    // Etapa 1: Contar o total de aulas do produto
    console.log('--- Etapa 1: Buscando módulos ---');
    const { data: modulesData, error: modulesError } = await serviceClient
      .from('modules')
      .select('id')
      .eq('product_id', productId);
    if (modulesError) throw modulesError;
    const moduleIds = modulesData?.map(m => m.id) || [];
    console.log(`--- Módulos encontrados: ${moduleIds.length} ---`, moduleIds);
    
    if (moduleIds.length === 0) {
        // Se não há módulos, não há aulas, então retorna uma lista vazia de alunos
        return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    console.log('--- Contando total de aulas ---');
    const { count: totalLessons, error: lessonsError } = await serviceClient
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .in('module_id', moduleIds);
    if (lessonsError) throw lessonsError;
    console.log(`--- Total de aulas no curso: ${totalLessons} ---`);

    // Etapa 2: Buscar os alunos matriculados
    console.log('--- Etapa 2: Buscando matrículas (enrollments) ---');
    const { data: enrollments, error: enrollmentsError } = await serviceClient
      .from('enrollments')
      .select('enrolled_at, user_id, profiles!inner(id, full_name, email)')
      .eq('product_id', productId);
    if (enrollmentsError) throw enrollmentsError;
    console.log(`--- Matrículas encontradas: ${enrollments?.length} ---`);

    // Etapa 3: Para cada aluno, calcular o progresso
    console.log('--- Etapa 3: Calculando progresso para cada aluno ---');
    const students = [];
    for (const enrollment of enrollments || []) {
      console.log(`--- Processando aluno: ${enrollment.profiles.email} ---`);
      const { count: completedLessons, error: progressError } = await serviceClient
        .from('lesson_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', enrollment.user_id)
        .eq('is_completed', true)
        .in('lesson_id', 
          serviceClient.from('lessons').select('id').in('module_id', moduleIds)
        );

      if (progressError) {
        console.error(`--- ERRO ao buscar progresso para o usuário ${enrollment.user_id} ---`, progressError);
        continue; // Pula para o próximo aluno em caso de erro
      }
      
      const progressPercentage = totalLessons > 0 ? Math.round(((completedLessons || 0) / totalLessons) * 100) : 0;
      console.log(`--- Progresso do aluno: ${progressPercentage}% (${completedLessons}/${totalLessons}) ---`);
      
      students.push({
        id: enrollment.profiles.id,
        name: enrollment.profiles.full_name || 'Nome não informado',
        email: enrollment.profiles.email,
        enrolled_at: enrollment.enrolled_at,
        progress: progressPercentage,
      });
    }

    console.log('--- Processamento de alunos concluído com sucesso ---');
    return new Response(JSON.stringify(students), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('--- ERRO DETALHADO NA FUNÇÃO GET-SPACE-ENROLLMENTS ---:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
