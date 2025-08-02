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

    const { items, type } = await req.json(); // 'type' pode ser 'modules' ou 'lessons'
    if (!items || !Array.isArray(items) || !type) {
      throw new Error("Payload inválido. 'items' (array) e 'type' são obrigatórios.");
    }

    // Mapeia as atualizações
    const updates = items.map((item, index) => ({
      id: item.id,
      display_order: index
    }));

    // Executa as atualizações na tabela correta
    const { error } = await serviceClient
      .from(type) // Usa o 'type' para definir a tabela dinamicamente
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})