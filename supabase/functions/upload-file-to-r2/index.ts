import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.583.0";
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const file = await req.arrayBuffer();
    const contentType = req.headers.get('content-type') || 'application/octet-stream';
    const fileName = req.headers.get('x-file-name') || `file-${Date.now()}`;
    
    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")!,
      },
    });

    const objectKey = `uploads/${user.id}/${Date.now()}-${decodeURIComponent(fileName)}`;
    
    const command = new PutObjectCommand({
      Bucket: Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME"),
      Key: objectKey,
      Body: new Uint8Array(file),
      ContentType: contentType,
    });

    await r2Client.send(command);

    // IMPORTANTE: O domínio público do R2 precisará ser configurado e esta URL ajustada.
    const publicUrl = `https://pub-your-public-r2-domain.r2.dev/${objectKey}`; 

    return new Response(JSON.stringify({ publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("[ERRO NO UPLOAD PROXY]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});