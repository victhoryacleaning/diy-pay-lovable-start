// supabase/functions/update-space-details/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { spaceId, name, slug } = await req.json();
    if (!spaceId || !name || !slug) {
      throw new Error("O ID do Space, nome e slug são obrigatórios.");
    }

    const { data, error } = await serviceClient
      .from('spaces')
      .update({ name: name, slug: slug })
      .eq('id', spaceId)
      .eq('producer_id', user.id) // Garante que o usuário só pode editar seus próprios spaces
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error("Área de Membros não encontrada ou você não tem permissão para editá-la.");
      }
      throw error;
    }
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})