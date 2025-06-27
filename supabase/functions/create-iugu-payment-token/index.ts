
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
}

interface PaymentTokenPayload {
  card_number: string;
  verification_value: string;
  first_name: string;
  last_name: string;
  month: string;
  year: string;
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
}

function validatePaymentToken(payload: PaymentTokenPayload): string[] {
  const errors: string[] = [];
  
  // Card number validation
  const cardNumber = payload.card_number?.replace(/\D/g, '');
  if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
    errors.push('Número do cartão inválido');
  }
  
  // CVV validation
  const cvv = payload.verification_value?.replace(/\D/g, '');
  if (!cvv || cvv.length < 3 || cvv.length > 4) {
    errors.push('CVV inválido');
  }
  
  // Name validation
  const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
  if (!payload.first_name || !nameRegex.test(payload.first_name) || payload.first_name.length > 50) {
    errors.push('Nome inválido');
  }
  if (!payload.last_name || !nameRegex.test(payload.last_name) || payload.last_name.length > 50) {
    errors.push('Sobrenome inválido');
  }
  
  // Month validation
  const month = payload.month?.replace(/\D/g, '');
  if (!month || month.length !== 2 || parseInt(month) < 1 || parseInt(month) > 12) {
    errors.push('Mês inválido');
  }
  
  // Year validation
  const year = payload.year?.replace(/\D/g, '');
  const currentYear = new Date().getFullYear();
  if (!year || year.length !== 4 || parseInt(year) < currentYear || parseInt(year) > currentYear + 20) {
    errors.push('Ano inválido');
  }
  
  return errors;
}

function sanitizeInput(input: string): string {
  return input?.replace(/[<>]/g, '').trim() || '';
}

Deno.serve(async (req) => {
  console.log('[DEBUG] Iniciando create-iugu-payment-token');
  console.log('[DEBUG] Método da requisição:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by IP
    const clientIP = req.headers.get('cf-connecting-ip') || 
                    req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    
    if (!checkRateLimit(clientIP, 5, 60000)) {
      console.log('[SECURITY] Rate limit exceeded for IP:', clientIP);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: 'Muitas tentativas. Tente novamente em alguns minutos.',
          functionName: 'create-iugu-payment-token'
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[DEBUG] Iniciando processamento principal da função');

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

    if (!iuguApiKey || !iuguAccountId) {
      const errorMsg = 'Configuração da API da Iugu não encontrada para ambiente: ' + appEnv;
      console.error('[ERRO]', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: 'Configuração da API da Iugu não encontrada',
          functionName: 'create-iugu-payment-token'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    console.log('[DEBUG] Tentando fazer parse do body da requisição');
    let payload: PaymentTokenPayload;
    
    try {
      const requestText = await req.text();
      console.log('[DEBUG] Body recebido (tamanho):', requestText.length);
      payload = JSON.parse(requestText);
      
      // Sanitize input data
      payload.first_name = sanitizeInput(payload.first_name);
      payload.last_name = sanitizeInput(payload.last_name);
      payload.card_number = sanitizeInput(payload.card_number);
      payload.verification_value = sanitizeInput(payload.verification_value);
      payload.month = sanitizeInput(payload.month);
      payload.year = sanitizeInput(payload.year);
      
      console.log('[DEBUG] Payload sanitizado e parseado');
    } catch (parseError) {
      const errorMsg = 'Erro ao fazer parse do JSON da requisição';
      console.error('[ERRO]', errorMsg, parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: errorMsg,
          functionName: 'create-iugu-payment-token',
          details: parseError.toString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Enhanced validation
    const validationErrors = validatePaymentToken(payload);
    if (validationErrors.length > 0) {
      console.error('[ERRO] Validation errors:', validationErrors);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: 'Dados do cartão inválidos: ' + validationErrors.join(', '),
          functionName: 'create-iugu-payment-token'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[DEBUG] Validação dos dados concluída com sucesso');
    console.log('[DEBUG] Dados do cartão para tokenização (últimos 4 dígitos):', payload.card_number?.slice(-4));

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

    console.log('[DEBUG] Payload para enviar à Iugu:', {
      ...iuguPayload,
      data: {
        ...iuguPayload.data,
        number: iuguPayload.data.number.slice(0, 4) + '****' + iuguPayload.data.number.slice(-4),
        verification_value: '***'
      }
    });

    // Create Basic Auth header
    const authHeader = `Basic ${btoa(iuguApiKey + ':')}`;
    console.log('[DEBUG] Header de autenticação criado');

    // Call Iugu payment token API
    console.log('[DEBUG] Fazendo requisição para tokenização na Iugu');
    let iuguResponse;
    let iuguData;

    try {
      iuguResponse = await fetch('https://api.iugu.com/v1/payment_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'User-Agent': 'DIYPay/1.0',
        },
        body: JSON.stringify(iuguPayload),
      });

      console.log('[DEBUG] Status da resposta da Iugu:', iuguResponse.status);

      const responseText = await iuguResponse.text();
      console.log('[DEBUG] Resposta da Iugu recebida (tamanho):', responseText.length);

      try {
        iuguData = JSON.parse(responseText);
        console.log('[DEBUG] Dados parseados da resposta da Iugu');
      } catch (iuguParseError) {
        console.error('[ERRO] Erro ao fazer parse da resposta da Iugu:', iuguParseError);
        throw new Error('Resposta inválida da API da Iugu');
      }
    } catch (fetchError) {
      console.error('[ERRO] Erro na requisição para a Iugu:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: 'Erro na comunicação com a Iugu',
          functionName: 'create-iugu-payment-token',
          details: fetchError.toString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!iuguResponse.ok) {
      console.error('[ERRO] Tokenização falhou - resposta da Iugu:', iuguData);
      
      // Handle Iugu errors
      let errorMessage = 'Erro na tokenização do cartão';
      
      if (iuguData.errors) {
        // Extract specific error messages from Iugu
        const errorDetails = Object.entries(iuguData.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        errorMessage = `Dados do cartão inválidos: ${errorDetails}`;
      }

      const errorResponse = {
        success: false,
        error: true, 
        message: errorMessage,
        iugu_errors: iuguData.errors || iuguData,
        functionName: 'create-iugu-payment-token'
      };

      console.log('[DEBUG] Retornando erro da tokenização');
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Success: Token created
    console.log('[DEBUG] Token criado com sucesso:', iuguData.id ? 'ID presente' : 'ID ausente');

    const successResponse = {
      success: true,
      ...iuguData
    };

    console.log('[DEBUG] Retornando resposta de sucesso da tokenização');
    // Return the complete Iugu response (contains the token and any extra info)
    return new Response(
      JSON.stringify(successResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ERRO] Erro geral na create-iugu-payment-token:', error.message);
    console.error('[ERRO] Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: true, 
        message: 'Erro interno do servidor durante tokenização', 
        details: error.message,
        functionName: 'create-iugu-payment-token'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
