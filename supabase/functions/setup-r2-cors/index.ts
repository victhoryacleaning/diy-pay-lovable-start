import { S3Client, PutBucketCorsCommand } from "npm:@aws-sdk/client-s3@3.583.0";
import { corsHeaders } from '../_shared/cors.ts';

const corsConfig = (allowedOrigins: string[]) => ({
  CORSRules: [
    {
      AllowedOrigins: allowedOrigins,
      AllowedMethods: ['PUT', 'POST', 'GET', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3000,
    }
  ]
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")?.trim();
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID")?.trim();
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")?.trim();
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME")?.trim();

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("Secrets do R2 não configurados completamente");
    }

    const allowedOrigins = [
      "http://localhost:5173", 
      "https://*.lovableproject.com",
      "https://diypay.com.br",
      "https://id-preview--8f9085e6-3cb0-4a1b-bbe0-a727bed6f094.lovable.app"
    ];
    
    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const corsConfiguration = corsConfig(allowedOrigins);
    
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfiguration,
    });

    await r2Client.send(command);

    return new Response(JSON.stringify({ message: "Configuração de CORS do R2 atualizada com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("[ERRO DETALHADO FINAL]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
