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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")?.trim();
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID")?.trim();
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")?.trim();
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME")?.trim();

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("Um ou mais segredos do R2 não estão configurados.");
    }

    const allowedOrigins = ["http://localhost:5173", "https://diy-pay-lovable-start.lovable.app", "https://diypay.com.br", "https://*.lovableproject.com"];

    // --- CORREÇÃO FINAL E DEFINITIVA ---
    // Substituindo a região 'auto' por 'us-east-1' para resolver o bug de "Bad Request"
    const r2Client = new S3Client({
      region: "us-east-1", 
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    // --- FIM DA CORREÇÃO ---

    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfig(allowedOrigins),
    });

    await r2Client.send(command);

    return new Response(JSON.stringify({ message: "Configuração de CORS do R2 atualizada com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("[ERRO AO CONFIGURAR CORS]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
