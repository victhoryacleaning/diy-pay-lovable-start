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

    const { items, type } = await req.json(); // 'type' é 'modules' ou 'lessons'
    if (!items || !Array.isArray(items) || !type) {
      throw new Error("Payload inválido.");
    }

    // Mapeia os dados para o formato que a função SQL espera
    const updatePayload = items.map((item, index) => ({
      id: item.id,
      display_order: index
    }));
    
    // Chama a função RPC no banco de dados
    const { error } = await serviceClient.rpc('update_display_order', {
      table_name: type,
      items: updatePayload
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Erro em update-content-order:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})