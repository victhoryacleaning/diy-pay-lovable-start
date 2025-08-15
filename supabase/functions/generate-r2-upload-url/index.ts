import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.583.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.583.0";
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const { fileName, contentType } = await req.json();
    if (!fileName || !contentType) throw new Error("fileName e contentType são obrigatórios.");
    
    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")!,
      },
    });

    const objectKey = `uploads/${user.id}/${Date.now()}-${decodeURIComponent(fileName)}`;
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME");
    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID");
    const publicUrl = `https://pub-45cfd9014cd74b73af1cd35f4428f005.r2.dev/${objectKey}`;

    const command = new PutObjectCommand({
      Bucket: Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME"),
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 }); // URL válida por 10 minutos

    return new Response(JSON.stringify({ uploadUrl, publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("[ERRO AO GERAR URL]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});