import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CustomerPayload {
  email: string;
  name?: string;
  cpfCnpj?: string;
  phone?: string;
}

Deno.serve(async (req) => {
  console.log('[DEBUG] *** INÍCIO DA FUNÇÃO resolve-customer ***');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
          functionName: 'resolve-customer'
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
          functionName: 'resolve-customer'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate required fields
    if (!payload.email || !payload.name || !payload.cpfCnpj) {
      const errorMsg = 'Email, nome e CPF/CNPJ são obrigatórios';
      console.error('[ERRO] *** VALIDATION ERROR ***:', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: errorMsg,
          functionName: 'resolve-customer'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 1. Buscar o gateway de pagamento ativo
    console.log('[DEBUG] *** BUSCANDO GATEWAY ATIVO ***');
    const { data: activeGateway, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('gateway_identifier, credentials')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (gatewayError || !activeGateway) {
      const errorMsg = 'Nenhum gateway de pagamento ativo configurado';
      console.error('[ERRO] *** GATEWAY ERROR ***:', gatewayError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: errorMsg,
          functionName: 'resolve-customer'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[DEBUG] Gateway ativo encontrado:', activeGateway.gateway_identifier);

    // Limpar o CPF/CNPJ removendo caracteres não numéricos
    const cleanCpfCnpj = payload.cpfCnpj.replace(/\D/g, '');
    console.log('[DEBUG] CPF/CNPJ original:', payload.cpfCnpj, 'CPF/CNPJ limpo:', cleanCpfCnpj);

    // Check if buyer profile already exists
    let buyerProfile;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', payload.email)
        .eq('role', 'buyer')
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

    let customerId;
    let finalBuyerProfileId = null;

    // 2. Roteamento para o adaptador de cliente correto
    if (activeGateway.gateway_identifier === 'asaas') {
      console.log('[DEBUG] *** PROCESSANDO CLIENTE PARA ASAAS ***');
      
      const appEnv = Deno.env.get('APP_ENV') || 'test';
      const isProduction = appEnv === 'production';
      
      // --- INÍCIO DA CORREÇÃO ---
      // Garante que 'credentials' seja um objeto e extrai a 'api_key'.
      const credentials = activeGateway.credentials;
      if (typeof credentials !== 'object' || credentials === null) {
        throw new Error('Credenciais do gateway Asaas não configuradas ou em formato inválido.');
      }
      
      const asaasApiKey = isProduction 
        ? credentials.api_key_live || Deno.env.get('ASAAS_API_KEY_LIVE')
        : credentials.api_key_test || Deno.env.get('ASAAS_API_KEY_TEST');

      if (!asaasApiKey) {
        throw new Error('API key do Asaas não configurada');
      }
      // --- FIM DA CORREÇÃO ---

      const baseUrl = isProduction ? 'https://api.asaas.com' : 'https://sandbox.asaas.com';
      
      try {
        // Verificar se cliente já existe no Asaas
        const searchResponse = await fetch(`${baseUrl}/api/v3/customers?email=${encodeURIComponent(payload.email)}`, {
          headers: { 'access_token': asaasApiKey }
        });
        
        const searchData = await searchResponse.json();
        console.log('[DEBUG] Resultado da busca no Asaas:', searchData);

        if (searchData.data && searchData.data.length > 0) {
          customerId = searchData.data[0].id;
          console.log('[DEBUG] *** CLIENTE EXISTENTE ENCONTRADO NO ASAAS ***:', customerId);
        } else {
          // Criar novo cliente no Asaas
          console.log('[DEBUG] *** CRIANDO NOVO CLIENTE NO ASAAS ***');
          const customerPayload = {
            name: payload.name,
            email: payload.email,
            cpfCnpj: cleanCpfCnpj,
            phone: payload.phone || undefined
          };

          console.log('[DEBUG] Payload para criar cliente no Asaas:', JSON.stringify(customerPayload, null, 2));

          const createResponse = await fetch(`${baseUrl}/api/v3/customers`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'access_token': asaasApiKey 
            },
            body: JSON.stringify(customerPayload)
          });

          const createData = await createResponse.json();
          
          if (!createResponse.ok) {
            console.error('[ERRO] Falha ao criar cliente no Asaas:', createData);
            throw new Error(`Falha ao criar cliente no Asaas: ${JSON.stringify(createData.errors || createData)}`);
          }
          
          customerId = createData.id;
          console.log('[DEBUG] *** NOVO CLIENTE CRIADO NO ASAAS ***:', customerId);
        }
      } catch (asaasError) {
        console.error('[ERRO] Erro na comunicação com Asaas:', asaasError);
        throw new Error(`Erro na comunicação com Asaas: ${asaasError.message}`);
      }

    } else if (activeGateway.gateway_identifier === 'iugu') {
      console.log('[DEBUG] *** PROCESSANDO CLIENTE PARA IUGU ***');
      
      // Manter lógica existente para Iugu
      const appEnv = Deno.env.get('APP_ENV') || 'test';
      const isProduction = appEnv === 'production';
      const iuguApiKey = isProduction 
        ? Deno.env.get('IUGU_API_KEY_LIVE')
        : Deno.env.get('IUGU_API_KEY_TEST');

      if (!iuguApiKey) {
        throw new Error('API key da Iugu não configurada');
      }

      const authHeader = `Basic ${btoa(iuguApiKey + ':')}`;
      
      // Se o perfil já tem iugu_customer_id, usar ele
      if (buyerProfile?.iugu_customer_id) {
        customerId = buyerProfile.iugu_customer_id;
        console.log('[DEBUG] *** CLIENTE IUGU JÁ EXISTE ***:', customerId);
      } else {
        // Buscar por CPF/CNPJ primeiro, depois por email
        let searchResponse = await fetch(`https://api.iugu.com/v1/customers?query=${encodeURIComponent(cleanCpfCnpj)}`, {
          headers: { 'Authorization': authHeader }
        });
        
        let searchData = await searchResponse.json();
        
        if (!searchData.items || searchData.items.length === 0) {
          searchResponse = await fetch(`https://api.iugu.com/v1/customers?query=${encodeURIComponent(payload.email)}`, {
            headers: { 'Authorization': authHeader }
          });
          searchData = await searchResponse.json();
        }

        if (searchData.items && searchData.items.length > 0) {
          customerId = searchData.items[0].id;
          console.log('[DEBUG] *** CLIENTE EXISTENTE ENCONTRADO NA IUGU ***:', customerId);
        } else {
          // Criar novo cliente
          const createResponse = await fetch('https://api.iugu.com/v1/customers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify({
              email: payload.email,
              name: payload.name,
              cpf_cnpj: cleanCpfCnpj
            }),
          });

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Falha ao criar cliente na Iugu: ${errorText}`);
          }

          const createData = await createResponse.json();
          customerId = createData.id;
          console.log('[DEBUG] *** NOVO CLIENTE CRIADO NA IUGU ***:', customerId);
        }
      }

    } else {
      throw new Error(`Gateway '${activeGateway.gateway_identifier}' não suportado para criação de cliente`);
    }

    // 3. Salvar ou atualizar perfil do comprador
    if (buyerProfile) {
      // Atualizar perfil existente
      console.log('[DEBUG] *** ATUALIZANDO PERFIL EXISTENTE ***');
      const updateData: any = {
        iugu_customer_id: customerId,
        updated_at: new Date().toISOString()
      };

      if (payload.name && !buyerProfile.full_name) {
        updateData.full_name = payload.name;
      }

      if (cleanCpfCnpj && !buyerProfile.cpf_cnpj) {
        updateData.cpf_cnpj = cleanCpfCnpj;
      }

      if (payload.phone && !buyerProfile.phone) {
        updateData.phone = payload.phone;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', buyerProfile.id);

      if (updateError) {
        console.error('[ERRO] Falha ao atualizar perfil do comprador:', updateError);
      } else {
        console.log('[DEBUG] *** PERFIL DO COMPRADOR ATUALIZADO ***');
        finalBuyerProfileId = buyerProfile.id;
      }
    } else {
      // Criar novo perfil
      console.log('[DEBUG] *** CRIANDO NOVO PERFIL DE COMPRADOR ***');
      
      const profileId = crypto.randomUUID();
      const newProfileData = {
        id: profileId,
        email: payload.email,
        full_name: payload.name,
        cpf_cnpj: cleanCpfCnpj,
        phone: payload.phone || null,
        role: 'buyer',
        iugu_customer_id: customerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError, data: insertData } = await supabase
        .from('profiles')
        .insert(newProfileData)
        .select()
        .single();

      if (insertError) {
        console.error('[ERRO] Falha ao criar perfil do comprador:', insertError);
      } else {
        console.log('[DEBUG] *** NOVO PERFIL DE COMPRADOR CRIADO ***');
        finalBuyerProfileId = insertData.id;
      }
    }

    console.log('[DEBUG] *** RETORNANDO RESPOSTA FINAL ***');
    console.log('[DEBUG] customer_id:', customerId);
    console.log('[DEBUG] buyer_profile_id:', finalBuyerProfileId);

    return new Response(
      JSON.stringify({
        success: true,
        customer_id: customerId,
        buyer_profile_id: finalBuyerProfileId
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ERRO] *** ERRO GERAL NA resolve-customer ***:', error);
    return new Response(
      JSON.stringify({
        success: false, 
        error: true,
        message: 'Erro ao criar ou buscar cliente', 
        details: error.message,
        functionName: 'resolve-customer'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});