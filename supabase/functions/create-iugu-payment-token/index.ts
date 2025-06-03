
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentTokenPayload {
  card_number: string;
  verification_value: string;
  first_name: string;
  last_name: string;
  month: string;
  year: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment and API keys
    const appEnv = Deno.env.get('APP_ENV') || 'test';
    const isProduction = appEnv === 'production';
    
    const iuguApiKey = isProduction 
      ? Deno.env.get('IUGU_API_KEY_LIVE')
      : Deno.env.get('IUGU_API_KEY_TEST');
    
    const iuguAccountId = isProduction
      ? Deno.env.get('IUGU_ACCOUNT_ID_LIVE')
      : Deno.env.get('IUGU_ACCOUNT_ID_TEST');

    if (!iuguApiKey || !iuguAccountId) {
      console.error('Iugu API key or Account ID not found for environment:', appEnv);
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
    const payload: PaymentTokenPayload = await req.json();
    console.log('Received tokenization request for card ending in:', payload.card_number?.slice(-4));

    // Validate required fields
    const requiredFields = ['card_number', 'verification_value', 'first_name', 'last_name', 'month', 'year'];
    for (const field of requiredFields) {
      if (!payload[field as keyof PaymentTokenPayload]) {
        return new Response(
          JSON.stringify({ 
            error: true, 
            message: `Campo obrigatório não informado: ${field}` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Build payload for Iugu payment token API
    const iuguPayload = {
      account_id: iuguAccountId,
      method: 'credit_card',
      test: !isProduction, // Set test mode based on environment
      data: {
        number: payload.card_number,
        verification_value: payload.verification_value,
        first_name: payload.first_name,
        last_name: payload.last_name,
        month: payload.month,
        year: payload.year
      }
    };

    console.log('Sending tokenization request to Iugu for account:', iuguAccountId);

    // Create Basic Auth header
    const authHeader = `Basic ${btoa(iuguApiKey + ':')}`;

    // Call Iugu payment token API
    const iuguResponse = await fetch('https://api.iugu.com/v1/payment_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(iuguPayload),
    });

    const iuguData = await iuguResponse.json();
    console.log('Iugu tokenization response status:', iuguResponse.status);

    if (!iuguResponse.ok) {
      console.error('Iugu tokenization error:', iuguData);
      
      // Handle Iugu errors
      let errorMessage = 'Erro na tokenização do cartão';
      
      if (iuguData.errors) {
        // Extract specific error messages from Iugu
        const errorDetails = Object.entries(iuguData.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        errorMessage = `Dados do cartão inválidos: ${errorDetails}`;
      }

      return new Response(
        JSON.stringify({ 
          error: true, 
          message: errorMessage,
          iugu_errors: iuguData.errors || iuguData
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Success: Token created
    console.log('Payment token created successfully:', iuguData.id);

    // Return the complete Iugu response (contains the token and any extra info)
    return new Response(
      JSON.stringify(iuguData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in create-iugu-payment-token:', error);
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: 'Erro interno do servidor durante tokenização', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
