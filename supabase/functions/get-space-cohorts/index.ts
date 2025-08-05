import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { spaceId } = await req.json()

    if (!spaceId) {
      throw new Error('ID do Espaço (spaceId) é obrigatório.')
    }
    
    // Consulta SQL para buscar turmas com contagem de alunos e status 'is_default'
    const { data, error } = await supabase
      .from('cohorts')
      .select(`
        id,
        name,
        is_default,
        enrollments ( count )
      `)
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Formata a resposta para ser mais amigável ao frontend
    const formattedData = data.map(cohort => ({
      id: cohort.id,
      name: cohort.name,
      is_default: cohort.is_default,
      // A contagem vem em um array, então pegamos o primeiro elemento
      enrollments_count: cohort.enrollments?.count || 0
    }));

    return new Response(JSON.stringify(formattedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})