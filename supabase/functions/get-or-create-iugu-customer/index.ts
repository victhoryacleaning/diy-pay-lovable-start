
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get environment and API keys
    const appEnv = Deno.env.get('APP_ENV') || 'test';
    const isProduction = appEnv === 'production';
    
    const iuguApiKey = isProduction 
      ? Deno.env.get('IUGU_API_KEY_LIVE')
      : Deno.env.get('IUGU_API_KEY_TEST');
    
    const iuguAccountId = isProduction
      ? Deno.env.get('IUGU_ACCOUNT_ID_LIVE')
      : Deno.env.get('IUGU_ACCOUNT_ID_TEST');

    if (!iuguApiKey) {
      console.error('Iugu API key not found for environment:', appEnv);
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: 'Configuração da API da Iugu não encontrada' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const payload: IuguCustomerPayload = await req.json();
    console.log('Received payload:', payload);

    if (!payload.email) {
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: 'Email é obrigatório' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 1: Check if user exists in our database with iugu_customer_id
    if (payload.user_id) {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('iugu_customer_id')
        .eq('id', payload.user_id)
        .single();

      if (!profileError && profile?.iugu_customer_id) {
        console.log('Found existing iugu_customer_id:', profile.iugu_customer_id);
        return new Response(
          JSON.stringify({ 
            iugu_customer_id: profile.iugu_customer_id, 
            exists_in_iugu: true 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
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

    console.log('Sending to Iugu:', iuguPayload);

    // Create Basic Auth header
    const authHeader = `Basic ${btoa(iuguApiKey + ':')}`;

    const iuguResponse = await fetch('https://api.iugu.com/v1/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(iuguPayload),
    });

    const iuguData = await iuguResponse.json();
    console.log('Iugu response:', iuguData);

    if (!iuguResponse.ok) {
      // Handle specific Iugu errors
      if (iuguData.errors) {
        // Check if it's a "already exists" error
        if (iuguData.errors.email || iuguData.errors.cpf_cnpj) {
          console.log('Customer might already exist, trying to find...');
          
          // Try to find existing customer by email
          const searchResponse = await fetch(`https://api.iugu.com/v1/customers?query=${encodeURIComponent(payload.email)}`, {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
            },
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.items && searchData.items.length > 0) {
              const existingCustomer = searchData.items[0];
              console.log('Found existing customer:', existingCustomer.id);
              
              // Update our database with the found customer ID
              await updateProfileWithIuguId(supabaseClient, payload, existingCustomer.id);
              
              return new Response(
                JSON.stringify({ 
                  iugu_customer_id: existingCustomer.id, 
                  exists_in_iugu: true 
                }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              );
            }
          }
        }

        return new Response(
          JSON.stringify({ 
            error: true, 
            message: 'Erro ao criar cliente na Iugu', 
            details: iuguData.errors,
            iugu_errors: iuguData.errors 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: true, 
          message: 'Erro na comunicação com a Iugu', 
          details: iuguData 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Success: Customer created or retrieved
    const iuguCustomerId = iuguData.id;
    console.log('Iugu customer ID:', iuguCustomerId);

    // Update our database
    await updateProfileWithIuguId(supabaseClient, payload, iuguCustomerId);

    return new Response(
      JSON.stringify({ 
        iugu_customer_id: iuguCustomerId, 
        exists_in_iugu: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-or-create-iugu-customer:', error);
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: 'Erro interno do servidor', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function updateProfileWithIuguId(supabaseClient: any, payload: IuguCustomerPayload, iuguCustomerId: string) {
  try {
    if (payload.user_id) {
      // Update existing user profile
      const { error } = await supabaseClient
        .from('profiles')
        .update({ iugu_customer_id: iuguCustomerId })
        .eq('id', payload.user_id);
      
      if (error) {
        console.error('Error updating profile with user_id:', error);
      } else {
        console.log('Updated profile for user_id:', payload.user_id);
      }
    } else {
      // Check if profile exists by email
      const { data: existingProfile, error: searchError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', payload.email)
        .single();

      if (!searchError && existingProfile) {
        // Update existing profile found by email
        const { error } = await supabaseClient
          .from('profiles')
          .update({ iugu_customer_id: iuguCustomerId })
          .eq('email', payload.email);
        
        if (error) {
          console.error('Error updating profile by email:', error);
        } else {
          console.log('Updated profile for email:', payload.email);
        }
      } else {
        // Create new profile for guest user
        const newProfile = {
          email: payload.email,
          iugu_customer_id: iuguCustomerId,
          role: 'user',
          full_name: payload.name || null,
          cpf_cnpj: payload.cpf_cnpj || null,
          phone: payload.phone || null,
        };

        const { error } = await supabaseClient
          .from('profiles')
          .insert([newProfile]);
        
        if (error) {
          console.error('Error creating new profile:', error);
        } else {
          console.log('Created new profile for email:', payload.email);
        }
      }
    }
  } catch (error) {
    console.error('Error in updateProfileWithIuguId:', error);
  }
}
