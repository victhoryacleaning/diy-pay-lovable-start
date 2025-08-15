import { AwsV4Signer } from "https://esm.sh/aws4fetch@1.0.17";
import { corsHeaders } from '../_shared/cors.ts';

const corsConfigXml = (allowedOrigins: string[]) => `
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>${allowedOrigins.join('</AllowedOrigin><AllowedOrigin>')}</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
`.trim();

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
      "https://diy-pay-lovable-start.lovable.app", 
      "https://diypay.com.br",
      "https://*.lovableproject.com"
    ];
    
    const corsXmlBody = corsConfigXml(allowedOrigins);
    const bucketUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/?cors`;

    const signer = new AwsV4Signer({
      url: bucketUrl,
      accessKeyId,
      secretAccessKey,
      region: 'auto',
    });

    const response = await signer.fetch(bucketUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/xml' },
      body: corsXmlBody,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Erro da API do R2:", errorBody);
      throw new Error(`Falha ao configurar CORS: ${response.status} ${response.statusText} - ${errorBody}`);
    }

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
