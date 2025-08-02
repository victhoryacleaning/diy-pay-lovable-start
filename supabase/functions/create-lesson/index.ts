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

    // --- CORREÇÃO AQUI: Lendo os dados exatamente como o frontend envia ---
    const lessonDataFromFrontend = await req.json();
    const { 
      moduleId, 
      title, 
      video_source, // <-- Lendo o campo que realmente vem do frontend
      content_url, 
      content_text, 
      release_type, 
      release_days, 
      release_date, 
      is_free_sample 
    } = lessonDataFromFrontend;

    if (!moduleId || !title) {
      throw new Error("moduleId e title são obrigatórios.");
    }
    
    // --- LÓGICA DE NEGÓCIO NO BACKEND ---
    // Calculamos o content_type aqui, com base no que o frontend enviou.
    const content_type = video_source ? 'video' : 'text';

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

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
