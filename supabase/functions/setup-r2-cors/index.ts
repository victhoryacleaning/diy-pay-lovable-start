console.log("--- [DEBUG] Módulo setup-r2-cors carregado. Tentando importar dependências... ---");

import { S3Client, PutBucketCorsCommand } from "npm:@aws-sdk/client-s3@3.583.0";
import { corsHeaders } from '../_shared/cors.ts';

console.log("--- [DEBUG] Dependências importadas com sucesso. ---");

Deno.serve(async (_req) => {
  console.log("--- [DEBUG] Requisição recebida pela função. ---");
  try {
    console.log("--- [DEBUG] Entrou no bloco try. Lendo segredos... ---");

    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME");

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.error("--- [ERRO] Um ou mais segredos do R2 não foram encontrados. ---");
      throw new Error("Credenciais do R2 não configuradas nos segredos do projeto.");
    }
    console.log("--- [DEBUG] Segredos lidos com sucesso. Criando cliente S3... ---");

    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    console.log("--- [DEBUG] Cliente S3 criado. Montando comando CORS... ---");

    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "POST", "GET"],
            AllowedOrigins: ["http://localhost:5173", "https://diy-pay-lovable-start.lovable.app", "https://diypay.com.br"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    });
    
    console.log("--- [DEBUG] Comando CORS montado. Enviando para o R2... ---");
    await r2Client.send(command);
    console.log("--- [DEBUG] Comando enviado com sucesso! ---");
    
    return new Response(JSON.stringify({ message: "Configuração de CORS do R2 atualizada com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("--- [ERRO] Ocorreu um erro no bloco catch: ---", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});