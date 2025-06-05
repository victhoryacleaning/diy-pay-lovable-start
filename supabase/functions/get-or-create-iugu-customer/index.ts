
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
  console.log('[DEBUG] Iniciando get-or-create-iugu-customer');
  console.log('[DEBUG] Método da requisição:', req.method);
  console.log('[DEBUG] Headers da requisição:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[DEBUG] Iniciando processamento principal da função');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('[DEBUG] SUPABASE_URL existe:', !!supabaseUrl);
    console.log('[DEBUG] SUPABASE_SERVICE_ROLE_KEY existe:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = 'Variáveis de ambiente do Supabase não encontradas';
      console.error('[ERRO]', errorMsg);
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
    console.log('[DEBUG] Cliente Supabase inicializado');

    // Get environment and API keys
    const appEnv = Deno.env.get('APP_ENV') || 'test';
    const isProduction = appEnv === 'production';
    
    console.log('[DEBUG] APP_ENV:', appEnv);
    console.log('[DEBUG] isProduction:', isProduction);
    
    const iuguApiKey = isProduction 
      ? Deno.env.get('IUGU_API_KEY_LIVE')
      : Deno.env.get('IUGU_API_KEY_TEST');
    
    const iuguAccountId = isProduction
      ? Deno.env.get('IUGU_ACCOUNT_ID_LIVE')
      : Deno.env.get('IUGU_ACCOUNT_ID_TEST');

    console.log('[DEBUG] Iugu API Key existe:', !!iuguApiKey);
    console.log('[DEBUG] Iugu Account ID existe:', !!iuguAccountId);

    if (!iuguApiKey) {
      const errorMsg = 'Configuração da API da Iugu não encontrada para ambiente: ' + appEnv;
      console.error('[ERRO]', errorMsg);
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
    console.log('[DEBUG] Tentando fazer parse do body da requisição');
    let payload: IuguCustomerPayload;
    
    try {
      const requestText = await req.text();
      console.log('[DEBUG] Body bruto da requisição:', requestText);
      payload = JSON.parse(requestText);
      console.log('[DEBUG] Payload parseado:', payload);
    } catch (parseError) {
      const errorMsg = 'Erro ao fazer parse do JSON da requisição';
      console.error('[ERRO]', errorMsg, parseError);
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
      console.error('[ERRO]', errorMsg);
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

    // Step 1: Check if user exists in our database with iugu_customer_id
    if (payload.user_id) {
      console.log('[DEBUG] Verificando perfil existente para user_id:', payload.user_id);
      
      try {
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('iugu_customer_id')
          .eq('id', payload.user_id)
          .single();

        console.log('[DEBUG] Resultado da busca de perfil:', { profile, profileError });

        if (!profileError && profile?.iugu_customer_id) {
          console.log('[DEBUG] Encontrado iugu_customer_id existente:', profile.iugu_customer_id);
          const successResponse = { 
            success: true,
            iugu_customer_id: profile.iugu_customer_id, 
            exists_in_iugu: true 
          };
          console.log('[DEBUG] Retornando resposta de sucesso (cliente existente):', successResponse);
          return new Response(
            JSON.stringify(successResponse),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } catch (dbError) {
        console.error('[ERRO] Erro ao consultar perfil no banco:', dbError);
        // Continue com o processo de criação
      }
    }

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

    console.log('[DEBUG] Payload para enviar à Iugu:', iuguPayload);

    // Create Basic Auth header
    const authHeader = `Basic ${btoa(iuguApiKey + ':')}`;
    console.log('[DEBUG] Header de autenticação criado (primeiros 20 chars):', authHeader.substring(0, 20) + '...');

    console.log('[DEBUG] Fazendo requisição para criar cliente na Iugu');
    let iuguResponse;
    let iuguData;

    try {
      iuguResponse = await fetch('https://api.iugu.com/v1/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(iuguPayload),
      });

      console.log('[DEBUG] Status da resposta da Iugu:', iuguResponse.status);
      console.log('[DEBUG] Headers da resposta da Iugu:', Object.fromEntries(iuguResponse.headers.entries()));

      const responseText = await iuguResponse.text();
      console.log('[DEBUG] Texto bruto da resposta da Iugu:', responseText);

      try {
        iuguData = JSON.parse(responseText);
        console.log('[DEBUG] Dados parseados da resposta da Iugu:', iuguData);
      } catch (iuguParseError) {
        console.error('[ERRO] Erro ao fazer parse da resposta da Iugu:', iuguParseError);
        throw new Error('Resposta inválida da API da Iugu: ' + responseText);
      }
    } catch (fetchError) {
      console.error('[ERRO] Erro na requisição para a Iugu:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: 'Erro na comunicação com a Iugu',
          functionName: 'get-or-create-iugu-customer',
          details: fetchError.toString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!iuguResponse.ok) {
      console.log('[DEBUG] Resposta da Iugu não foi OK, verificando erros');
      
      // Handle specific Iugu errors
      if (iuguData.errors) {
        // Check if it's a "already exists" error
        if (iuguData.errors.email || iuguData.errors.cpf_cnpj) {
          console.log('[DEBUG] Cliente pode já existir, tentando encontrar...');
          
          try {
            // Try to find existing customer by email
            const searchResponse = await fetch(`https://api.iugu.com/v1/customers?query=${encodeURIComponent(payload.email)}`, {
              method: 'GET',
              headers: {
                'Authorization': authHeader,
              },
            });

            console.log('[DEBUG] Status da busca de cliente existente:', searchResponse.status);

            if (searchResponse.ok) {
              const searchText = await searchResponse.text();
              console.log('[DEBUG] Resposta da busca:', searchText);
              
              const searchData = JSON.parse(searchText);
              if (searchData.items && searchData.items.length > 0) {
                const existingCustomer = searchData.items[0];
                console.log('[DEBUG] Cliente existente encontrado:', existingCustomer.id);
                
                // Update our database with the found customer ID
                await updateProfileWithIuguId(supabaseClient, payload, existingCustomer.id);
                
                const successResponse = { 
                  success: true,
                  iugu_customer_id: existingCustomer.id, 
                  exists_in_iugu: true 
                };
                console.log('[DEBUG] Retornando cliente existente encontrado:', successResponse);
                return new Response(
                  JSON.stringify(successResponse),
                  { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                  }
                );
              }
            }
          } catch (searchError) {
            console.error('[ERRO] Erro na busca de cliente existente:', searchError);
          }
        }

        const errorResponse = { 
          success: false,
          error: true, 
          message: 'Erro ao criar cliente na Iugu', 
          details: iuguData.errors,
          iugu_errors: iuguData.errors,
          functionName: 'get-or-create-iugu-customer'
        };
        console.log('[DEBUG] Retornando erro da Iugu:', errorResponse);
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const errorResponse = { 
        success: false,
        error: true, 
        message: 'Erro na comunicação com a Iugu', 
        details: iuguData,
        functionName: 'get-or-create-iugu-customer'
      };
      console.log('[DEBUG] Retornando erro genérico da Iugu:', errorResponse);
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Success: Customer created or retrieved
    const iuguCustomerId = iuguData.id;
    console.log('[DEBUG] Cliente criado com sucesso - Iugu customer ID:', iuguCustomerId);

    // Update our database
    try {
      await updateProfileWithIuguId(supabaseClient, payload, iuguCustomerId);
      console.log('[DEBUG] Perfil atualizado no banco de dados');
    } catch (updateError) {
      console.error('[ERRO] Erro ao atualizar perfil no banco:', updateError);
      // Continue anyway, as the customer was created in Iugu
    }

    const successResponse = { 
      success: true,
      iugu_customer_id: iuguCustomerId, 
      exists_in_iugu: false 
    };
    console.log('[DEBUG] Retornando resposta de sucesso final:', successResponse);
    return new Response(
      JSON.stringify(successResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ERRO] Erro geral na get-or-create-iugu-customer:', error.message);
    console.error('[ERRO] Stack trace:', error.stack);
    console.error('[ERRO] Erro completo:', error);
    
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
  console.log('[DEBUG] Iniciando updateProfileWithIuguId com:', { user_id: payload.user_id, email: payload.email, iuguCustomerId });
  
  try {
    if (payload.user_id) {
      console.log('[DEBUG] Atualizando perfil por user_id:', payload.user_id);
      
      // Update existing user profile
      const { error } = await supabaseClient
        .from('profiles')
        .update({ iugu_customer_id: iuguCustomerId })
        .eq('id', payload.user_id);
      
      if (error) {
        console.error('[ERRO] Erro ao atualizar perfil com user_id:', error);
      } else {
        console.log('[DEBUG] Perfil atualizado com sucesso para user_id:', payload.user_id);
      }
    } else {
      console.log('[DEBUG] Buscando perfil por email:', payload.email);
      
      // Check if profile exists by email
      const { data: existingProfile, error: searchError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', payload.email)
        .single();

      console.log('[DEBUG] Resultado da busca por email:', { existingProfile, searchError });

      if (!searchError && existingProfile) {
        console.log('[DEBUG] Perfil encontrado por email, atualizando');
        
        // Update existing profile found by email
        const { error } = await supabaseClient
          .from('profiles')
          .update({ iugu_customer_id: iuguCustomerId })
          .eq('email', payload.email);
        
        if (error) {
          console.error('[ERRO] Erro ao atualizar perfil por email:', error);
        } else {
          console.log('[DEBUG] Perfil atualizado com sucesso para email:', payload.email);
        }
      } else {
        console.log('[DEBUG] Perfil não encontrado por email, criando novo');
        
        // Create new profile for guest user
        const newProfile = {
          email: payload.email,
          iugu_customer_id: iuguCustomerId,
          role: 'user',
          full_name: payload.name || null,
          cpf_cnpj: payload.cpf_cnpj || null,
          phone: payload.phone || null,
        };

        console.log('[DEBUG] Criando novo perfil:', newProfile);

        const { error } = await supabaseClient
          .from('profiles')
          .insert([newProfile]);
        
        if (error) {
          console.error('[ERRO] Erro ao criar novo perfil:', error);
        } else {
          console.log('[DEBUG] Novo perfil criado com sucesso para email:', payload.email);
        }
      }
    }
  } catch (error) {
    console.error('[ERRO] Erro em updateProfileWithIuguId:', error);
    throw error;
  }
}
