import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CohortUpdate {
  space_id: string;
  cohort_id: string;
  name?: string;
  is_default?: boolean;
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

    const { cohort_id, space_id, name, is_default }: CohortUpdate = await req.json()

    if (!cohort_id || !space_id) {
      throw new Error('ID da turma (cohort_id) e ID do espaço (space_id) são obrigatórios.')
    }

    // Se a intenção é tornar esta turma a padrão
    if (is_default === true) {
      // Inicia uma transação para garantir a atomicidade
      const { error: transactionError } = await supabase.rpc('set_new_default_cohort', {
        p_space_id: space_id,
        p_new_default_cohort_id: cohort_id
      });

      if (transactionError) throw transactionError;
    }
    
    // Se a intenção é apenas renomear, sem alterar o status de padrão
    if (name) {
      const { error: updateError } = await supabase
        .from('cohorts')
        .update({ name })
        .eq('id', cohort_id)

      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ message: 'Turma atualizada com sucesso!' }), {
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