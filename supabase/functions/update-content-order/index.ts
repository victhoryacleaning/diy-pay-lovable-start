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
    console.log('--- Payload recebido ---', { items, type });

    if (!items || !Array.isArray(items) || !type || (type !== 'modules' && type !== 'lessons')) {
      throw new Error("Payload inválido. 'items' (array) e 'type' ('modules' ou 'lessons') são obrigatórios.");
    }

    console.log(`--- Iniciando ${updates.length} atualizações na tabela "${type}" ---`);

    const updates = items.map((item, index) => 
      serviceClient
        .from(type)
        .update({ display_order: index })
        .eq('id', item.id)
    );

    const results = await Promise.all(updates);
    console.log('--- Resultados das atualizações do Supabase ---', results);

    const firstError = results.find(result => result.error);
    if (firstError) {
      console.error('--- ERRO ENCONTRADO EM UMA DAS ATUALIZAÇÕES ---', firstError.error);
      throw firstError.error;
    }
    
    console.log('--- Todas as atualizações concluídas com sucesso ---');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('--- ERRO DETALHADO NA FUNÇÃO UPDATE-CONTENT-ORDER ---:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
