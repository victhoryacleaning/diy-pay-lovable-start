// supabase/functions/create-lesson/index.ts

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

    const lessonData = await req.json();
    const { 
      moduleId, 
      title, 
      content_type, 
      content_url, 
      content_text, 
      release_type, 
      release_days, 
      release_date, 
      is_free_sample 
    } = lessonData;

    if (!moduleId || !title || !content_type) {
      throw new Error("moduleId, title, e content_type são obrigatórios.");
    }
    
    // Log dos dados recebidos para depuração
    console.log('--- DADOS RECEBIDOS PARA CRIAR AULA ---', JSON.stringify(lessonData, null, 2));

    const { data, error } = await serviceClient
      .from('lessons')
      .insert({ 
        module_id: moduleId, 
        title: title,
        content_type: content_type,
        content_url: content_url || null,
        content_text: content_text || null,
        release_type: release_type || 'immediate',
        release_days: release_days || null,
        release_date: release_date || null,
        is_free_sample: is_free_sample || false,
      })
      .select()
      .single();

    if (error) {
      // Log do erro específico do Supabase
      console.error('--- ERRO DO SUPABASE AO INSERIR ---', JSON.stringify(error, null, 2));
      throw error;
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    // --- MUDANÇA CRÍTICA AQUI ---
    // Logamos o erro completo e detalhado antes de retornar uma resposta.
    console.error('--- ERRO DETALHADO NA FUNÇÃO CREATE-LESSON ---:', JSON.stringify(error, null, 2));
    
    return new Response(JSON.stringify({ 
      error: 'Erro interno no servidor. Verifique os logs da função.',
      detailed_error: error 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
