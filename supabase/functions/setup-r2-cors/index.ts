import { S3Client, PutBucketCorsCommand } from "npm:@aws-sdk/client-s3@3.583.0";
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (_req) => {
  try {
    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")!,
      },
    });

    const command = new PutBucketCorsCommand({
      Bucket: Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME"),
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "POST", "GET"],
            AllowedOrigins: ["http://localhost:3000", "http://localhost:5173", "https://SEU_DOMINIO_DE_PRODUCAO.com"], // IMPORTANTE: Adicione seu domínio de produção aqui
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    });
    
    await r2Client.send(command);
    
    return new Response(JSON.stringify({ message: "Configuração de CORS do R2 atualizada com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});