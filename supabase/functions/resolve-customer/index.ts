import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const payload = await req.json();

    if (!payload.email || !payload.name || !payload.cpfCnpj) {
      throw new Error("Email, nome e CPF/CNPJ são obrigatórios.");
    }
    
    const { data: activeGateway } = await supabaseAdmin.from('payment_gateways').select('gateway_identifier, credentials').eq('is_active', true).limit(1).single();
    if (!activeGateway) {
      throw new Error('Nenhum gateway de pagamento ativo configurado.');
    }

    let customerId;
    
    if (activeGateway.gateway_identifier === 'asaas') {
      const credentials = activeGateway.credentials;
      if (typeof credentials !== 'object' || credentials === null || !credentials.api_key) {
        throw new Error('API key do Asaas não configurada ou em formato inválido.');
      }
      const asaasApiKey = credentials.api_key;
      const baseUrl = 'https://sandbox.asaas.com';
      
      const searchResponse = await fetch(`${baseUrl}/api/v3/customers?email=${encodeURIComponent(payload.email)}`, { headers: { 'access_token': asaasApiKey } });
      const searchData = await searchResponse.json();

      if (searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id;
      } else {
        const createResponse = await fetch(`${baseUrl}/api/v3/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
          body: JSON.stringify({ name: payload.name, email: payload.email, cpfCnpj: payload.cpfCnpj.replace(/\D/g, '') })
        });
        const createData = await createResponse.json();
        if (!createResponse.ok) throw new Error(JSON.stringify(createData.errors));
        customerId = createData.id;
      }
    } else {
      throw new Error(`Gateway '${activeGateway.gateway_identifier}' não suportado.`);
    }

    return new Response(JSON.stringify({ success: true, customer_id: customerId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});