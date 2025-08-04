// supabase/functions/update-content-order/index.ts

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
    if (!items || !Array.isArray(items) || !type || (type !== 'modules' && type !== 'lessons')) {
      throw new Error("Payload inválido. 'items' (array) e 'type' ('modules' ou 'lessons') são obrigatórios.");
    }

    // --- LÓGICA DE ATUALIZAÇÃO DIRETA E ROBUSTA ---
    // Em vez de usar RPC, iteramos e atualizamos cada item individualmente.
    // Isso é mais explícito e menos propenso a erros de permissão ou de tipo.
    const updates = items.map((item, index) => 
      serviceClient
        .from(type)
        .update({ display_order: index })
        .eq('id', item.id)
    );

    // Executa todas as atualizações em paralelo
    const results = await Promise.all(updates);

    // Verifica se houve algum erro em qualquer uma das atualizações
    const firstError = results.find(result => result.error);
    if (firstError) {
      throw firstError.error;
    }

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
