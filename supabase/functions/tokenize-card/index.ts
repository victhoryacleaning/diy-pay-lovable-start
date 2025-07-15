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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { holderName, number, expiryMonth, expiryYear, ccv, name, email, cpfCnpj, customer_id } = await req.json();

    console.log('[TOKENIZE_CARD] Iniciando tokenização de cartão de crédito');

    // Buscar o gateway ativo
    const { data: activeGateway, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('gateway_identifier, gateway_name, credentials')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (gatewayError || !activeGateway) {
      throw new Error('Nenhum gateway de pagamento ativo encontrado.');
    }

    console.log(`[TOKENIZE_CARD] Gateway ativo: ${activeGateway.gateway_name} (${activeGateway.gateway_identifier})`);

    if (activeGateway.gateway_identifier === 'asaas') {
      // Processar tokenização via Asaas
      const credentials = activeGateway.credentials as any;
      const apiKey = credentials.api_key;

      if (!apiKey) {
        throw new Error('API Key do Asaas não configurada.');
      }

      console.log('[ASAAS_TOKENIZE] Iniciando tokenização via Asaas...');

      const asaasPayload = {
        customer: customer_id,
        creditCard: {
          holderName,
          number: number.replace(/\s/g, ''),
          expiryMonth,
          expiryYear,
          ccv
        },
        creditCardHolderInfo: {
          name: holderName,
          email,
          cpfCnpj: cpfCnpj.replace(/\D/g, ''),
          postalCode: '00000000',
          addressNumber: '1',
          phone: '0000000000'
        }
      };

      console.log('[ASAAS_TOKENIZE] Enviando dados para tokenização...');

      const asaasResponse = await fetch('https://sandbox.asaas.com/api/v3/creditCard/tokenize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': apiKey,
        },
        body: JSON.stringify(asaasPayload),
      });

      const responseData = await asaasResponse.json();

      if (!asaasResponse.ok) {
        console.error('[ASAAS_TOKENIZE] Erro na tokenização:', responseData);
        throw new Error(responseData.errors?.[0]?.description || 'Erro ao tokenizar cartão com Asaas');
      }

      console.log('[ASAAS_TOKENIZE] Tokenização realizada com sucesso');

      return new Response(
        JSON.stringify({
          success: true,
          creditCardToken: responseData.creditCardToken,
          gateway: 'asaas'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } else if (activeGateway.gateway_identifier === 'stripe') {
      throw new Error('Tokenização via Stripe não implementada ainda.');
    } else if (activeGateway.gateway_identifier === 'mercadopago') {
      throw new Error('Tokenização via Mercado Pago não implementada ainda.');
    } else {
      throw new Error(`Gateway ${activeGateway.gateway_identifier} não suportado para tokenização.`);
    }

  } catch (error) {
    console.error('[TOKENIZE_CARD] Erro:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});