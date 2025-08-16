import { S3Client, PutBucketCorsCommand } from "npm:@aws-sdk/client-s3@3.583.0";
import { corsHeaders } from '../_shared/cors.ts';

const corsConfig = (allowedOrigins: string[]) => ({
  CORSRules: [
    {
      AllowedOrigins: allowedOrigins,
      AllowedMethods: ['PUT', 'POST', 'GET', 'HEAD', 'DELETE'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag', 'Content-Length', 'x-amz-meta-*'],
      MaxAgeSeconds: 3600,
    }
  ]
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("[DEBUG] Iniciando configuração de CORS...");
    
    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")?.trim();
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID")?.trim();
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")?.trim();
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME")?.trim();

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      const missing = [];
      if (!accountId) missing.push("CLOUDFLARE_R2_ACCOUNT_ID");
      if (!accessKeyId) missing.push("CLOUDFLARE_R2_ACCESS_KEY_ID");
      if (!secretAccessKey) missing.push("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
      if (!bucketName) missing.push("CLOUDFLARE_R2_BUCKET_NAME");
      throw new Error(`Segredos faltando: ${missing.join(", ")}`);
    }

    const allowedOrigins = [
      "http://localhost:5173", "http://localhost:3000",
      "https://diy-pay-lovable-start.lovable.app", "https://diypay.com.br",
      "https://*.lovableproject.com", "https://*.lovable.app"
    ];

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const r2Client = new S3Client({
      region: "auto",
      endpoint: endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfig(allowedOrigins),
    });

    await r2Client.send(command);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Configuração de CORS do R2 aplicada com sucesso!",
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("[ERRO COMPLETO]", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
