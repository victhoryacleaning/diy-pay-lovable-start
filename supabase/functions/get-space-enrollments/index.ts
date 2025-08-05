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
    
    const token = req.headers.get('Authorization')!.replace('Bearer ', '')
    const { data: { user } } = await serviceClient.auth.getUser(token)
    if (!user) throw new Error('Unauthorized');

    const { productId } = await req.json();
    if (!productId) throw new Error("ID do produto é obrigatório.");

    console.log('🔍 Fetching enrollments for product:', productId);

    // 1. Contar o total de aulas do produto
    const { data: modulesData, error: modulesError } = await serviceClient
      .from('modules')
      .select('id')
      .eq('product_id', productId);
    
    if (modulesError) throw modulesError;
    
    const moduleIds = modulesData?.map(m => m.id) || [];
    
    const { count: totalLessons, error: lessonsError } = await serviceClient
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .in('module_id', moduleIds);
    
    if (lessonsError) throw lessonsError;

    console.log('📚 Total lessons:', totalLessons);

    // 2. Buscar os alunos matriculados
    const { data: enrollments, error: enrollmentsError } = await serviceClient
      .from('enrollments')
      .select(`
        enrolled_at,
        user_id,
        profiles!inner(id, full_name, email)
      `)
      .eq('product_id', productId);
    
    if (enrollmentsError) throw enrollmentsError;

    console.log('👥 Found enrollments:', enrollments?.length);

    // 3. Para cada aluno, calcular o progresso
    const students = [];
    for (const enrollment of enrollments || []) {
      const { count: completedLessons, error: progressError } = await serviceClient
        .from('lesson_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', enrollment.user_id)
        .eq('is_completed', true)
        .in('lesson_id', 
          serviceClient
            .from('lessons')
            .select('id')
            .in('module_id', moduleIds)
        );

      if (progressError) {
        console.error('Error fetching progress for user:', enrollment.user_id, progressError);
        continue;
      }

      const progressPercentage = totalLessons > 0 ? Math.round(((completedLessons || 0) / totalLessons) * 100) : 0;
      
      students.push({
        id: enrollment.profiles.id,
        name: enrollment.profiles.full_name || 'Nome não informado',
        email: enrollment.profiles.email,
        enrolled_at: enrollment.enrolled_at,
        progress: progressPercentage,
        completed_lessons: completedLessons || 0,
        total_lessons: totalLessons
      });
    }

    console.log('✅ Processed students:', students.length);

    return new Response(JSON.stringify(students), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Error in get-space-enrollments:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})