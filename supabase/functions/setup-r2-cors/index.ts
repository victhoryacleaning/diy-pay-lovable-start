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

Deno.serve(async (_req) => {
  try {
    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")?.trim() || '';
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID")?.trim() || '';
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")?.trim() || '';
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME")?.trim() || '';

    // --- INÍCIO DO BLOCO DE DIAGNÓSTICO FINAL ---
    console.log(`[DIAGNÓSTICO] accountId: '${accountId}'`);
    console.log(`[DIAGNÓSTICO] bucketName: '${bucketName}'`);
    console.log(`[DIAGNÓSTICO] accessKeyId (primeiros 4 chars): '${accessKeyId.substring(0, 4)}...'`);
    const finalUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/?cors`;
    console.log(`[DIAGNÓSTICO] URL Final Construída: '${finalUrl}'`);
    // --- FIM DO BLOCO DE DIAGNÓSTICO FINAL ---

    const url = new URL(finalUrl); // Usar o construtor de URL para validar
    
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
    
    const bodyDigest = await crypto.subtle.digest('MD5', new TextEncoder().encode(corsXmlBody));
    signedRequest.headers.set('Content-MD5', btoa(String.fromCharCode(...new Uint8Array(bodyDigest))));

    const response = await fetch(signedRequest);

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