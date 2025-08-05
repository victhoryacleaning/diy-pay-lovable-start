import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CohortDelete {
  cohort_id: string;
}

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

    const { cohort_id }: CohortDelete = await req.json()

    if (!cohort_id) {
      throw new Error('ID da turma (cohort_id) é obrigatório.')
    }

    // Verifica se a turma é a padrão antes de deletar
    const { data: cohort, error: fetchError } = await supabase
      .from('cohorts')
      .select('is_default')
      .eq('id', cohort_id)
      .single()

    if (fetchError) throw fetchError;

    if (cohort?.is_default) {
      throw new Error('Não é possível excluir a turma padrão. Defina outra turma como padrão antes de excluir esta.');
    }

    // Procede com a exclusão
    const { error: deleteError } = await supabase
      .from('cohorts')
      .delete()
      .eq('id', cohort_id)

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ message: 'Turma excluída com sucesso!' }), {
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