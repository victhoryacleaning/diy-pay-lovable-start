
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('[DEBUG] *** INÍCIO DA FUNÇÃO get-sale-details ***');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const saleId = url.searchParams.get('sale_id');

    console.log('[DEBUG] Sale ID recebido:', saleId);

    if (!saleId) {
      console.error('[ERRO] Sale ID não fornecido');
      return new Response(
        JSON.stringify({ error: 'Sale ID é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[DEBUG] Buscando dados da venda:', saleId);

    // Buscar dados da venda com informações do produto
    const { data: sale, error } = await supabase
      .from('sales')
      .select(`
        *,
        products!inner(name, price_cents)
      `)
      .eq('id', saleId)
      .single();

    console.log('[DEBUG] Resultado da busca:', { sale, error });

    if (error) {
      console.error('[ERRO] Erro ao buscar venda:', error);
      return new Response(
        JSON.stringify({ error: 'Venda não encontrada' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!sale) {
      console.error('[ERRO] Venda não encontrada com ID:', saleId);
      return new Response(
        JSON.stringify({ error: 'Venda não encontrada' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[DEBUG] *** RETORNANDO DADOS DA VENDA ***:', {
      id: sale.id,
      payment_method: sale.payment_method_used,
      status: sale.status,
      has_pix_qr_code: !!sale.iugu_pix_qr_code_base64,
      has_pix_text: !!sale.iugu_pix_qr_code_text,
      has_invoice_url: !!sale.iugu_invoice_secure_url,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sale: {
          id: sale.id,
          product_id: sale.product_id,
          buyer_email: sale.buyer_email,
          amount_total_cents: sale.amount_total_cents,
          payment_method_used: sale.payment_method_used,
          installments_chosen: sale.installments_chosen,
          status: sale.status,
          iugu_invoice_secure_url: sale.iugu_invoice_secure_url,
          iugu_pix_qr_code_base64: sale.iugu_pix_qr_code_base64,
          iugu_pix_qr_code_text: sale.iugu_pix_qr_code_text,
          iugu_bank_slip_barcode: sale.iugu_bank_slip_barcode,
          created_at: sale.created_at,
          paid_at: sale.paid_at,
          products: sale.products,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ERRO] Erro interno:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
