

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IuguCustomerPayload {
  email: string;
  name?: string;
  cpf_cnpj?: string;
  phone_prefix?: string;
  phone?: string;
  cc_emails?: string;
  zip_code?: string;
  number?: string;
  street?: string;
  city?: string;
  state?: string;
  district?: string;
  complement?: string;
  user_id?: string;
}

interface IuguCustomerResponse {
  id: string;
  email: string;
  name?: string;
  cpf_cnpj?: string;
  [key: string]: any;
}

Deno.serve(async (req) => {
  console.log('*** DEBUG GET_CUSTOMER: INÍCIO DA FUNÇÃO get-or-create-iugu-customer ***');
  console.log('*** DEBUG GET_CUSTOMER: Método da requisição:', req.method);
  console.log('*** DEBUG GET_CUSTOMER: URL da requisição:', req.url);
  console.log('*** DEBUG GET_CUSTOMER: Headers da requisição:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('*** DEBUG GET_CUSTOMER: Retornando resposta CORS para OPTIONS ***');
    return new Response(null, { headers: corsHeaders });
  }

  // Envolver TODA a lógica em try-catch para garantir JSON sempre
  try {
    console.log('*** DEBUG GET_CUSTOMER: INICIANDO PROCESSAMENTO PRINCIPAL ***');

    // Verificar se é POST
    if (req.method !== 'POST') {
      console.error('*** ERRO GET_CUSTOMER: Método não permitido:', req.method);
      return new Response(
        JSON.stringify({
          success: false,
          error: true,
          functionName: 'get-or-create-iugu-customer',
          message: `Método ${req.method} não permitido. Use POST.`,
          details: `Método recebido: ${req.method}`
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('*** DEBUG GET_CUSTOMER: SUPABASE_URL:', supabaseUrl ? 'PRESENTE' : 'AUSENTE');
    console.log('*** DEBUG GET_CUSTOMER: SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'PRESENTE' : 'AUSENTE');

    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = 'Variáveis de ambiente do Supabase não encontradas';
      console.error('*** ERRO GET_CUSTOMER: CRITICAL ERROR ***:', errorMsg);
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

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    console.log('*** DEBUG GET_CUSTOMER: Cliente Supabase inicializado com sucesso ***');

    // Get environment and API keys
    const appEnv = Deno.env.get('APP_ENV') || 'test';
    const isProduction = appEnv === 'production';
    
    console.log('*** DEBUG GET_CUSTOMER: APP_ENV:', appEnv);
    console.log('*** DEBUG GET_CUSTOMER: isProduction:', isProduction);
    
    const iuguApiKey = isProduction 
      ? Deno.env.get('IUGU_API_KEY_LIVE')
      : Deno.env.get('IUGU_API_KEY_TEST');
    
    const iuguAccountId = isProduction
      ? Deno.env.get('IUGU_ACCOUNT_ID_LIVE')
      : Deno.env.get('IUGU_ACCOUNT_ID_TEST');

    console.log('*** DEBUG GET_CUSTOMER: Iugu API Key:', iuguApiKey ? 'PRESENTE (length: ' + iuguApiKey.length + ')' : 'AUSENTE');
    console.log('*** DEBUG GET_CUSTOMER: Iugu Account ID:', iuguAccountId ? 'PRESENTE' : 'AUSENTE');

    if (!iuguApiKey) {
      const errorMsg = 'Configuração da API da Iugu não encontrada para ambiente: ' + appEnv;
      console.error('*** ERRO GET_CUSTOMER: CRITICAL ERROR ***:', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: 'Configuração da API da Iugu não encontrada',
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    console.log('*** DEBUG GET_CUSTOMER: TENTANDO FAZER PARSE DO BODY ***');
    let payload: IuguCustomerPayload;
    
    try {
      const requestText = await req.text();
      console.log('*** DEBUG GET_CUSTOMER: Body bruto recebido (length: ' + requestText.length + '):', requestText);
      payload = JSON.parse(requestText);
      console.log('*** DEBUG GET_CUSTOMER: Payload parseado com sucesso ***:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      const errorMsg = 'Erro ao fazer parse do JSON da requisição';
      console.error('*** ERRO GET_CUSTOMER: PARSE ERROR ***:', errorMsg, parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: errorMsg,
          functionName: 'get-or-create-iugu-customer',
          details: parseError.toString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!payload.email) {
      const errorMsg = 'Email é obrigatório';
      console.error('*** ERRO GET_CUSTOMER: VALIDATION ERROR ***:', errorMsg);
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

    console.log('*** DEBUG GET_CUSTOMER: VALIDAÇÃO DO PAYLOAD PASSOU ***');

    // Step 1: Check if user exists in our database with iugu_customer_id
    if (payload.user_id) {
      console.log('*** DEBUG GET_CUSTOMER: VERIFICANDO PERFIL EXISTENTE *** para user_id:', payload.user_id);
      
      try {
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('iugu_customer_id')
          .eq('id', payload.user_id)
          .single();

        console.log('*** DEBUG GET_CUSTOMER: Resultado da busca de perfil ***:', { profile, profileError });

        if (!profileError && profile?.iugu_customer_id) {
          console.log('*** DEBUG GET_CUSTOMER: ENCONTRADO CLIENTE EXISTENTE ***:', profile.iugu_customer_id);
          const successResponse = { 
            success: true,
            iugu_customer_id: profile.iugu_customer_id, 
            exists_in_iugu: true 
          };
          console.log('*** DEBUG GET_CUSTOMER: RETORNANDO RESPOSTA DE SUCESSO (cliente existente) ***:', JSON.stringify(successResponse, null, 2));
          return new Response(
            JSON.stringify(successResponse),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } catch (dbError) {
        console.error('*** ERRO GET_CUSTOMER: Erro ao consultar perfil no banco ***:', dbError);
        // Continue com o processo de criação
      }
    }

    console.log('*** DEBUG GET_CUSTOMER: CRIANDO/BUSCANDO CLIENTE NA IUGU ***');

    // Step 2: Create or get customer from Iugu
    const iuguPayload: any = {
      email: payload.email,
    };

    // Add optional fields if provided
    if (payload.name) iuguPayload.name = payload.name;
    if (payload.cpf_cnpj) iuguPayload.cpf_cnpj = payload.cpf_cnpj;
    if (payload.phone_prefix && payload.phone) {
      iuguPayload.phone_prefix = payload.phone_prefix;
      iuguPayload.phone = payload.phone;
    }
    if (payload.cc_emails) iuguPayload.cc_emails = payload.cc_emails;
    if (payload.zip_code) iuguPayload.zip_code = payload.zip_code;
    if (payload.number) iuguPayload.number = payload.number;
    if (payload.street) iuguPayload.street = payload.street;
    if (payload.city) iuguPayload.city = payload.city;
    if (payload.state) iuguPayload.state = payload.state;
    if (payload.district) iuguPayload.district = payload.district;
    if (payload.complement) iuguPayload.complement = payload.complement;

    console.log('*** DEBUG GET_CUSTOMER: Payload para enviar à Iugu ***:', JSON.stringify(iuguPayload, null, 2));

    // Create Basic Auth header
    const authHeader = `Basic ${btoa(iuguApiKey + ':')}`;
    console.log('*** DEBUG GET_CUSTOMER: Header de autenticação criado (primeiros 30 chars) ***:', authHeader.substring(0, 30) + '...');

    // Prepare fetch options for Iugu API
    const iuguUrl = 'https://api.iugu.com/v1/customers';
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'DIYPay-EdgeFunction/1.0'
      },
      body: JSON.stringify(iuguPayload),
    };

    console.log('*** DEBUG GET_CUSTOMER: FAZENDO REQUISIÇÃO PARA CRIAR CLIENTE NA IUGU ***');
    console.log('*** DEBUG GET_CUSTOMER: URL da Iugu ***:', iuguUrl);
    console.log('*** DEBUG GET_CUSTOMER: Headers para Iugu ***:', JSON.stringify(fetchOptions.headers, null, 2));
    console.log('*** DEBUG GET_CUSTOMER: Body para Iugu ***:', fetchOptions.body);

    let iuguResponse;
    let iuguData;

    try {
      console.log('*** DEBUG GET_CUSTOMER: Chamando fetch para a API da Iugu ***');
      iuguResponse = await fetch(iuguUrl, fetchOptions);

      console.log('*** DEBUG GET_CUSTOMER: RESPOSTA DA IUGU RECEBIDA ***');
      console.log('*** DEBUG GET_CUSTOMER: Status da resposta da Iugu ***:', iuguResponse.status);
      console.log('*** DEBUG GET_CUSTOMER: Status text da resposta da Iugu ***:', iuguResponse.statusText);
      console.log('*** DEBUG GET_CUSTOMER: Headers da resposta da Iugu ***:', Object.fromEntries(iuguResponse.headers.entries()));

      const responseText = await iuguResponse.text();
      console.log('*** DEBUG GET_CUSTOMER: Texto bruto da resposta da Iugu (length: ' + responseText.length + ') ***:', responseText);

      try {
        iuguData = JSON.parse(responseText);
        console.log('*** DEBUG GET_CUSTOMER: DADOS PARSEADOS DA IUGU ***:', JSON.stringify(iuguData, null, 2));
      } catch (iuguParseError) {
        console.error('*** ERRO GET_CUSTOMER: ERRO AO FAZER PARSE DA RESPOSTA DA IUGU ***:', iuguParseError);
        return new Response(
          JSON.stringify({
            success: false,
            error: true, 
            message: 'Resposta inválida da API da Iugu',
            functionName: 'get-or-create-iugu-customer',
            details: 'Resposta da Iugu: ' + responseText
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } catch (fetchError) {
      console.error('*** ERRO GET_CUSTOMER: ERRO NA REQUISIÇÃO PARA A IUGU ***:', fetchError);
      console.error('*** ERRO GET_CUSTOMER: Detalhes do erro de fetch ***:', fetchError.name, fetchError.message, fetchError.stack);
      return new Response(
        JSON.stringify({
          success: false,
          error: true, 
          message: 'Erro na comunicação com a Iugu',
          functionName: 'get-or-create-iugu-customer',
          details: `${fetchError.name}: ${fetchError.message}`
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!iuguResponse.ok) {
      console.log('*** DEBUG GET_CUSTOMER: RESPOSTA DA IUGU NÃO FOI OK ***');
      
      // Handle specific Iugu errors
      if (iuguData.errors) {
        console.log('*** DEBUG GET_CUSTOMER: Erros específicos da Iugu detectados ***:', iuguData.errors);
        
        // Check if it's a "already exists" error
        if (iuguData.errors.email || iuguData.errors.cpf_cnpj) {
          console.log('*** DEBUG GET_CUSTOMER: CLIENTE PODE JÁ EXISTIR, TENTANDO ENCONTRAR ***');
          
          try {
            // Try to find existing customer by email
            const searchUrl = `https://api.iugu.com/v1/customers?query=${encodeURIComponent(payload.email)}`;
            console.log('*** DEBUG GET_CUSTOMER: Fazendo busca de cliente existente ***:', searchUrl);
            
            const searchResponse = await fetch(searchUrl, {
              method: 'GET',
              headers: {
                'Authorization': authHeader,
                'User-Agent': 'DIYPay-EdgeFunction/1.0'
              },
            });

            console.log('*** DEBUG GET_CUSTOMER: Status da busca de cliente existente ***:', searchResponse.status);

            if (searchResponse.ok) {
              const searchText = await searchResponse.text();
              console.log('*** DEBUG GET_CUSTOMER: Resposta da busca (length: ' + searchText.length + ') ***:', searchText);
              
              const searchData = JSON.parse(searchText);
              if (searchData.items && searchData.items.length > 0) {
                const existingCustomer = searchData.items[0];
                console.log('*** DEBUG GET_CUSTOMER: CLIENTE EXISTENTE ENCONTRADO ***:', existingCustomer.id);
                
                // Update our database with the found customer ID
                await updateProfileWithIuguId(supabaseClient, payload, existingCustomer.id);
                
                const successResponse = { 
                  success: true,
                  iugu_customer_id: existingCustomer.id, 
                  exists_in_iugu: true 
                };
                console.log('*** DEBUG GET_CUSTOMER: RETORNANDO CLIENTE EXISTENTE ENCONTRADO ***:', JSON.stringify(successResponse, null, 2));
                return new Response(
                  JSON.stringify(successResponse),
                  { 
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                  }
                );
              }
            }
          } catch (searchError) {
            console.error('*** ERRO GET_CUSTOMER: Erro na busca de cliente existente ***:', searchError);
          }
        }

        return new Response(
          JSON.stringify({ 
            success: false,
            error: true, 
            message: 'Erro ao criar cliente na Iugu', 
            details: iuguData.errors,
            iugu_errors: iuguData.errors,
            functionName: 'get-or-create-iugu-customer'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: 'Erro na comunicação com a Iugu', 
          details: iuguData,
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Success: Customer created or retrieved
    const iuguCustomerId = iuguData.id;
    console.log('*** DEBUG GET_CUSTOMER: CLIENTE CRIADO COM SUCESSO *** - Iugu customer ID:', iuguCustomerId);

    // Update our database
    try {
      console.log('*** DEBUG GET_CUSTOMER: ATUALIZANDO PERFIL NO BANCO DE DADOS ***');
      await updateProfileWithIuguId(supabaseClient, payload, iuguCustomerId);
      console.log('*** DEBUG GET_CUSTOMER: Perfil atualizado no banco de dados com sucesso ***');
    } catch (updateError) {
      console.error('*** ERRO GET_CUSTOMER: Erro ao atualizar perfil no banco ***:', updateError);
      // Continue anyway, as the customer was created in Iugu
    }

    const successResponse = { 
      success: true,
      iugu_customer_id: iuguCustomerId, 
      exists_in_iugu: false 
    };
    console.log('*** DEBUG GET_CUSTOMER: RETORNANDO RESPOSTA DE SUCESSO FINAL ***:', JSON.stringify(successResponse, null, 2));
    return new Response(
      JSON.stringify(successResponse),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('*** ERRO GET_CUSTOMER: ERRO GERAL NA get-or-create-iugu-customer ***:', error.message);
    console.error('*** ERRO GET_CUSTOMER: Stack trace ***:', error.stack);
    console.error('*** ERRO GET_CUSTOMER: Erro completo ***:', error);
    
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

async function updateProfileWithIuguId(supabaseClient: any, payload: IuguCustomerPayload, iuguCustomerId: string) {
  console.log('*** DEBUG GET_CUSTOMER: INICIANDO updateProfileWithIuguId ***:', { user_id: payload.user_id, email: payload.email, iuguCustomerId });
  
  try {
    if (payload.user_id) {
      console.log('*** DEBUG GET_CUSTOMER: Atualizando perfil por user_id ***:', payload.user_id);
      
      // Update existing user profile
      const { error } = await supabaseClient
        .from('profiles')
        .update({ iugu_customer_id: iuguCustomerId })
        .eq('id', payload.user_id);
      
      if (error) {
        console.error('*** ERRO GET_CUSTOMER: Erro ao atualizar perfil com user_id ***:', error);
      } else {
        console.log('*** DEBUG GET_CUSTOMER: Perfil atualizado com sucesso para user_id ***:', payload.user_id);
      }
    } else {
      console.log('*** DEBUG GET_CUSTOMER: Buscando perfil por email ***:', payload.email);
      
      // Check if profile exists by email
      const { data: existingProfile, error: searchError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', payload.email)
        .single();

      console.log('*** DEBUG GET_CUSTOMER: Resultado da busca por email ***:', { existingProfile, searchError });

      if (!searchError && existingProfile) {
        console.log('*** DEBUG GET_CUSTOMER: Perfil encontrado por email, atualizando ***');
        
        // Update existing profile found by email
        const { error } = await supabaseClient
          .from('profiles')
          .update({ iugu_customer_id: iuguCustomerId })
          .eq('email', payload.email);
        
        if (error) {
          console.error('*** ERRO GET_CUSTOMER: Erro ao atualizar perfil por email ***:', error);
        } else {
          console.log('*** DEBUG GET_CUSTOMER: Perfil atualizado com sucesso para email ***:', payload.email);
        }
      } else {
        console.log('*** DEBUG GET_CUSTOMER: Perfil não encontrado por email, criando novo ***');
        
        // Create new profile for guest user with proper ID generation
        const profileId = crypto.randomUUID();
        const newProfile = {
          id: profileId, // Explicitly set UUID to avoid NOT NULL constraint
          email: payload.email,
          iugu_customer_id: iuguCustomerId,
          role: 'user',
          full_name: payload.name || null,
          cpf_cnpj: payload.cpf_cnpj || null,
          phone: payload.phone || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('*** DEBUG GET_CUSTOMER: Criando novo perfil ***:', newProfile);

        const { error } = await supabaseClient
          .from('profiles')
          .insert([newProfile]);
        
        if (error) {
          console.error('*** ERRO GET_CUSTOMER: Erro ao criar novo perfil ***:', error);
        } else {
          console.log('*** DEBUG GET_CUSTOMER: Novo perfil criado com sucesso para email ***:', payload.email);
        }
      }
    }
  } catch (error) {
    console.error('*** ERRO GET_CUSTOMER: Erro em updateProfileWithIuguId ***:', error);
    throw error;
  }
}

