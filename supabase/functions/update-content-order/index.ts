// supabase/functions/update-content-order/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  console.log('--- [update-content-order] Função iniciada ---');
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
    console.log(`--- Usuário autenticado: ${user.id} ---`);

    const { items, type } = await req.json();
    console.log('--- Payload recebido ---', { items: items?.length, type });

    if (!items || !Array.isArray(items) || !type || (type !== 'modules' && type !== 'lessons')) {
      throw new Error("Payload inválido. 'items' (array) e 'type' ('modules' ou 'lessons') são obrigatórios.");
    }

    const updatePayload = items.map((item, index) => ({
      id: item.id,
      display_order: index
    }));
    console.log(`--- Payload preparado para RPC: ---`, { table_name: type, items: updatePayload });
    
    // Chama a função RPC no banco de dados
    const { data, error } = await serviceClient.rpc('update_display_order', {
      table_name: type,
      items: updatePayload
    });

    if (error) {
       console.error('--- ERRO DETALHADO DA CHAMADA RPC ---', error);
       throw error;
    }

    console.log('--- Chamada RPC concluída com sucesso ---', { data });

    return new Response(JSON.stringify({ success: true, updated: updatePayload.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('--- ERRO GERAL NA FUNÇÃO UPDATE-CONTENT-ORDER ---:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
