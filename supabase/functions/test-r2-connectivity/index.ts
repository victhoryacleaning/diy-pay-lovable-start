import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (_req) => {
  console.log("Iniciando teste de conectividade com o R2...");
  
  try {
    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")?.trim();
    if (!accountId) {
      throw new Error("Secret CLOUDFLARE_R2_ACCOUNT_ID não encontrado.");
    }

    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    console.log(`Tentando conectar ao endpoint: ${r2Endpoint}`);

    // Um simples HEAD request para verificar se o host é alcançável
    const response = await fetch(r2Endpoint, { method: 'HEAD' });

    console.log(`Resposta recebida do endpoint. Status: ${response.status}`);

    if (response.status === 403) { // 403 (Forbidden) é uma resposta de SUCESSO neste teste.
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Conectividade com o R2 estabelecida com sucesso! (Recebido 403 Forbidden, o que é esperado sem credenciais)." 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error(`Resposta inesperada do endpoint: Status ${response.status}`);

  } catch (error) {
    console.error("[ERRO DE CONECTIVIDADE]", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Falha na conexão com o R2: ${error.message}` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});