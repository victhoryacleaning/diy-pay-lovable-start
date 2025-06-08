
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CustomerPayload {
  email: string;
  name?: string;
  cpf_cnpj?: string;
}

Deno.serve(async (req) => {
  console.log('[DEBUG] *** INÍCIO DA FUNÇÃO get-or-create-iugu-customer ***');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment and API keys
    const appEnv = Deno.env.get('APP_ENV') || 'test';
    const isProduction = appEnv === 'production';
    
    const iuguApiKey = isProduction 
      ? Deno.env.get('IUGU_API_KEY_LIVE')
      : Deno.env.get('IUGU_API_KEY_TEST');

    if (!iuguApiKey) {
      const errorMsg = 'Configuração da API da Iugu não encontrada';
      console.error('[ERRO] *** CRITICAL ERROR ***:', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: errorMsg,
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = 'Variáveis de ambiente do Supabase não encontradas';
      console.error('[ERRO] *** CRITICAL ERROR ***:', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: errorMsg,
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let payload: CustomerPayload;
    
    try {
      const requestText = await req.text();
      console.log('[DEBUG] Body bruto recebido:', requestText);
      payload = JSON.parse(requestText);
      console.log('[DEBUG] Payload parseado:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      const errorMsg = 'Erro ao fazer parse do JSON da requisição';
      console.error('[ERRO] *** PARSE ERROR ***:', errorMsg, parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: errorMsg,
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate required fields
    if (!payload.email) {
      const errorMsg = 'Email é obrigatório';
      console.error('[ERRO] *** VALIDATION ERROR ***:', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: errorMsg,
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[DEBUG] *** PROCESSANDO CLIENTE PARA EMAIL ***:', payload.email);

    // Check if buyer profile already exists
    let buyerProfile;
    try {
      const { data, error } = await supabase
        .from('buyer_profiles')
        .select('*')
        .eq('email', payload.email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[ERRO] Erro ao buscar perfil do comprador:', error);
      } else {
        buyerProfile = data;
        console.log('[DEBUG] Perfil do comprador encontrado:', buyerProfile ? 'SIM' : 'NÃO');
      }
    } catch (dbError) {
      console.error('[ERRO] Erro na busca do perfil do comprador:', dbError);
    }

    // If buyer profile exists and has iugu_customer_id, return it
    if (buyerProfile?.iugu_customer_id) {
      console.log('[DEBUG] *** CLIENTE IUGU JÁ EXISTE ***:', buyerProfile.iugu_customer_id);
      return new Response(
        JSON.stringify({
          success: true,
          customer_id: buyerProfile.iugu_customer_id,
          existing: true
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create or get Iugu customer
    const authHeader = `Basic ${btoa(iuguApiKey + ':')}`;
    console.log('[DEBUG] *** CRIANDO/BUSCANDO CLIENTE NA IUGU ***');

    try {
      // First, try to find existing customer in Iugu
      console.log('[DEBUG] Buscando cliente existente na Iugu...');
      const searchResponse = await fetch(`https://api.iugu.com/v1/customers?query=${encodeURIComponent(payload.email)}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      });

      let iuguCustomerId;

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log('[DEBUG] Resultado da busca de cliente:', searchData);

        if (searchData.items && searchData.items.length > 0) {
          // Customer found
          iuguCustomerId = searchData.items[0].id;
          console.log('[DEBUG] *** CLIENTE EXISTENTE ENCONTRADO NA IUGU ***:', iuguCustomerId);
        }
      }

      // If no customer found, create new one
      if (!iuguCustomerId) {
        console.log('[DEBUG] *** CRIANDO NOVO CLIENTE NA IUGU ***');
        const customerPayload: any = {
          email: payload.email
        };

        if (payload.name) {
          customerPayload.name = payload.name;
        }

        if (payload.cpf_cnpj) {
          customerPayload.cpf_cnpj = payload.cpf_cnpj;
        }

        console.log('[DEBUG] Payload para criar cliente:', JSON.stringify(customerPayload, null, 2));

        const createResponse = await fetch('https://api.iugu.com/v1/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(customerPayload),
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          iuguCustomerId = createData.id;
          console.log('[DEBUG] *** NOVO CLIENTE CRIADO NA IUGU ***:', iuguCustomerId);
        } else {
          const errorText = await createResponse.text();
          console.error('[ERRO] Falha ao criar cliente na Iugu:', errorText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: true,
              message: 'Falha ao criar cliente na Iugu',
              details: errorText,
              functionName: 'get-or-create-iugu-customer'
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      // Save or update buyer profile
      if (buyerProfile) {
        // Update existing profile
        console.log('[DEBUG] *** ATUALIZANDO PERFIL EXISTENTE ***');
        const updateData: any = {
          iugu_customer_id: iuguCustomerId,
          updated_at: new Date().toISOString()
        };

        if (payload.name && !buyerProfile.name) {
          updateData.name = payload.name;
        }

        if (payload.cpf_cnpj && !buyerProfile.cpf_cnpj) {
          updateData.cpf_cnpj = payload.cpf_cnpj;
        }

        const { error: updateError } = await supabase
          .from('buyer_profiles')
          .update(updateData)
          .eq('id', buyerProfile.id);

        if (updateError) {
          console.error('[ERRO] Falha ao atualizar perfil do comprador:', updateError);
        } else {
          console.log('[DEBUG] *** PERFIL DO COMPRADOR ATUALIZADO ***');
        }
      } else {
        // Create new profile - não referenciar auth.users
        console.log('[DEBUG] *** CRIANDO NOVO PERFIL DE COMPRADOR ***');
        const { error: insertError } = await supabase
          .from('buyer_profiles')
          .insert({
            email: payload.email,
            name: payload.name || null,
            cpf_cnpj: payload.cpf_cnpj || null,
            iugu_customer_id: iuguCustomerId
          });

        if (insertError) {
          console.error('[ERRO] Falha ao criar perfil do comprador:', insertError);
          // Não falhar aqui, pois o cliente Iugu foi criado com sucesso
        } else {
          console.log('[DEBUG] *** NOVO PERFIL DE COMPRADOR CRIADO ***');
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          customer_id: iuguCustomerId,
          existing: false
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (error) {
      console.error('[ERRO] *** ERRO NA CRIAÇÃO/BUSCA DO CLIENTE IUGU ***:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: 'Erro na criação/busca do cliente',
          details: error.message,
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('[ERRO] *** ERRO GERAL NA get-or-create-iugu-customer ***:', error);
    return new Response(
      JSON.stringify({
        success: false, 
        error: true,
        message: 'Erro interno do servidor', 
        details: error.message,
        functionName: 'get-or-create-iugu-customer'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
