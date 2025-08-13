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

    const { lesson_id, is_completed } = await req.json();
    if (!lesson_id || typeof is_completed !== 'boolean') {
      throw new Error("lesson_id e is_completed (booleano) são obrigatórios.");
    }

    const { data, error } = await serviceClient
      .from('lesson_progress')
      .upsert({ 
        user_id: user.id, 
        lesson_id: lesson_id, 
        is_completed: is_completed,
        completed_at: is_completed ? new Date().toISOString() : null
      }, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (error) throw error;
    
    return new Response(JSON.stringify(data), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})