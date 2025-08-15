import { AwsV4Signer } from "aws4fetch";
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

Deno.serve(async (_req) => {
  try {
    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")!;
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID")!;
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")!;
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME")!;

    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucketName}?cors`);
    
    const allowedOrigins = ["http://localhost:5173", "https://diy-pay-lovable-start.lovable.app", "https://diypay.com.br"];
    const corsXmlBody = corsConfigXml(allowedOrigins);

    const signer = new AwsV4Signer({
      accessKeyId,
      secretAccessKey,
      region: 'auto',
      service: 's3',
    });

    const request = new Request(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/xml' },
      body: corsXmlBody,
    });

    const signedRequest = await signer.sign(request);
    
    // Adiciona o header Content-MD5 após a assinatura
    const bodyDigest = await crypto.subtle.digest('MD5', new TextEncoder().encode(corsXmlBody));
    signedRequest.headers.set('Content-MD5', btoa(String.fromCharCode(...new Uint8Array(bodyDigest))));
    
    const response = await fetch(signedRequest);

    if (!response.ok) {
      throw new Error(`Falha ao configurar CORS: ${response.status} ${response.statusText} - ${await response.text()}`);
    }

    return new Response(JSON.stringify({ message: "Configuração de CORS do R2 atualizada com sucesso via aws4fetch!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("[ERRO DETALHADO aws4fetch]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});