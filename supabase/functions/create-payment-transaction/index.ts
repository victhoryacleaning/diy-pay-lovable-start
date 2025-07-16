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
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const payload = await req.json();

        const { data: activeGateway } = await supabase.from('payment_gateways').select('*').eq('is_active', true).single();
        if (!activeGateway) throw new Error("Nenhum gateway ativo.");

        const { data: product } = await supabase.from('products').select('*').eq('id', payload.product_id).single();
        if (!product) throw new Error("Produto não encontrado.");
        
        const totalAmount = product.price_cents;
        let paymentResponse;
        
        if(activeGateway.gateway_identifier === 'asaas') {
            const { api_key } = activeGateway.credentials;
            const baseUrl = 'https://sandbox.asaas.com';
            
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 3);

            const invoicePayload: any = {
                customer: payload.customer_id,
                billingType: payload.payment_method_used === 'credit_card' ? 'CREDIT_CARD' : payload.payment_method_used.toUpperCase(),
                value: totalAmount / 100,
                dueDate: dueDate.toISOString().split('T')[0],
                description: `Pagamento: ${product.name}`,
            };

            if (invoicePayload.billingType === 'CREDIT_CARD') {
                if (!payload.creditCardToken) throw new Error("Token do cartão é obrigatório para Asaas.");
                invoicePayload.creditCardToken = payload.creditCardToken;
            }
            
            const response = await fetch(`${baseUrl}/api/v3/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'access_token': api_key },
                body: JSON.stringify(invoicePayload)
            });

            paymentResponse = await response.json();
            if (!response.ok) throw new Error(JSON.stringify(paymentResponse.errors));
        } else {
            throw new Error("Gateway não suportado.");
        }

        const { data: newSale, error: insertError } = await supabase.from('sales').insert([{
            product_id: payload.product_id,
            buyer_email: payload.buyer_email,
            gateway_identifier: activeGateway.gateway_identifier,
            gateway_transaction_id: paymentResponse.id,
            amount_total_cents: totalAmount,
            status: 'pending_payment',
            payment_method_used: payload.payment_method_used,
            platform_fee_cents: Math.round(totalAmount * 0.05),
            producer_share_cents: totalAmount - Math.round(totalAmount * 0.05)
        }]).select().single();

        if (insertError) throw insertError;

        return new Response(JSON.stringify({ success: true, sale_id: newSale.id, ...paymentResponse }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});