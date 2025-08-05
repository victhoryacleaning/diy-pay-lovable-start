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
    );
    
    // Obter o usuário a partir do token de autorização para identificar o criador
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado.');
    }

    const { spaceId, name } = await req.json();
    if (!spaceId || !name) {
      throw new Error('ID do Espaço (spaceId) e Nome da Turma (name) são obrigatórios.');
    }

    // Inserir a nova turma com o user_id do criador
    const { error } = await supabase
      .from('cohorts')
      .insert({
        space_id: spaceId,
        name: name,
        is_default: false, // Novas turmas manuais nunca são a padrão
        user_id: user.id   // <-- Inclusão do user_id para cumprir a política RLS
      });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ message: 'Turma criada com sucesso' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})