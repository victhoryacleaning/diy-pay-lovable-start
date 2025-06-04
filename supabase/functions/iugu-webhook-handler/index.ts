
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IuguWebhookPayload {
  event: string;
  data: {
    id: string;
    status: string;
    total_cents?: number;
    paid_at?: string;
    notification_url?: string;
    [key: string]: any;
  };
  webhook_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook received from Iugu');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get platform fee percentage
    const platformFeePercentage = parseFloat(Deno.env.get('PLATFORM_FEE_PERCENTAGE') || '0.05');

    // Parse webhook payload
    const payload: IuguWebhookPayload = await req.json();
    console.log('Webhook payload:', {
      event: payload.event,
      data_id: payload.data?.id,
      status: payload.data?.status,
      webhook_id: payload.webhook_id
    });

    const { event, data } = payload;

    // Extract identifiers
    const iuguInvoiceId = data.id;
    const iuguChargeId = data.id; // Could be charge ID if event is about charges
    
    // Try to extract sale_id from notification_url if available
    let saleIdFromUrl: string | null = null;
    if (data.notification_url) {
      try {
        const url = new URL(data.notification_url);
        saleIdFromUrl = url.searchParams.get('sale_id');
      } catch (error) {
        console.log('Could not parse notification_url:', error);
      }
    }

    // Find the sale in our database
    let saleQuery = supabase.from('sales').select(`
      *,
      product:products(
        id,
        producer_id,
        name
      )
    `);

    // Use sale_id from URL if available, otherwise search by iugu_invoice_id or iugu_charge_id
    if (saleIdFromUrl) {
      saleQuery = saleQuery.eq('id', saleIdFromUrl);
    } else {
      saleQuery = saleQuery.or(`iugu_invoice_id.eq.${iuguInvoiceId},iugu_charge_id.eq.${iuguChargeId}`);
    }

    const { data: sale, error: saleError } = await saleQuery.single();

    if (saleError || !sale) {
      console.error('Sale not found for webhook:', {
        iuguInvoiceId,
        iuguChargeId,
        saleIdFromUrl,
        error: saleError
      });
      
      // Return 200 to prevent Iugu from retrying this webhook
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook received but sale not found in our system' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Found sale:', {
      sale_id: sale.id,
      current_status: sale.status,
      new_status: data.status,
      product_id: sale.product_id,
      producer_id: sale.product?.producer_id
    });

    // Process different webhook events
    if (event === 'invoice.status_changed' || event === 'invoice.created') {
      await processInvoiceStatusChange(supabase, sale, data, platformFeePercentage);
    } else if (event === 'invoice.refund') {
      await processRefund(supabase, sale, data, platformFeePercentage);
    } else {
      console.log('Unhandled webhook event:', event);
      // Still update the status if it's different
      if (sale.status !== data.status) {
        await supabase
          .from('sales')
          .update({ status: data.status })
          .eq('id', sale.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        sale_id: sale.id,
        event: event,
        status: data.status
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Still return 200 to prevent unnecessary retries from Iugu
    // Log the error but don't let it cause webhook failures
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal error processing webhook',
        error: error.message 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function processInvoiceStatusChange(
  supabase: any, 
  sale: any, 
  invoiceData: any, 
  platformFeePercentage: number
) {
  const newStatus = invoiceData.status;
  const currentStatus = sale.status;

  console.log('Processing status change:', { currentStatus, newStatus });

  // Idempotency check - if status hasn't changed, do nothing
  if (currentStatus === newStatus) {
    console.log('Status unchanged, skipping processing');
    return;
  }

  // Update the sale status
  const updateData: any = {
    status: newStatus,
    updated_at: new Date().toISOString()
  };

  // If payment is confirmed
  if (newStatus === 'paid' && currentStatus !== 'paid') {
    console.log('Processing payment confirmation');
    
    updateData.paid_at = new Date().toISOString();

    // Calculate fees (reconfirm calculation)
    const amountTotalCents = sale.amount_total_cents;
    const platformFeeCents = Math.round(amountTotalCents * platformFeePercentage);
    const producerShareCents = amountTotalCents - platformFeeCents;

    // Update sale with payment info
    updateData.platform_fee_cents = platformFeeCents;
    updateData.producer_share_cents = producerShareCents;

    // Update sale record
    const { error: updateError } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', sale.id);

    if (updateError) {
      console.error('Error updating sale:', updateError);
      throw updateError;
    }

    // Update producer balance
    const producerId = sale.product?.producer_id;
    if (producerId) {
      console.log('Updating producer balance:', {
        producer_id: producerId,
        amount_to_add: producerShareCents
      });

      const { error: balanceError } = await supabase
        .from('producer_financials')
        .update({
          available_balance_cents: supabase.raw(`available_balance_cents + ${producerShareCents}`),
          updated_at: new Date().toISOString()
        })
        .eq('producer_id', producerId);

      if (balanceError) {
        console.error('Error updating producer balance:', balanceError);
        // Don't throw here - the sale was already updated successfully
        // Log the error and potentially handle it separately
      } else {
        console.log('Producer balance updated successfully');
      }
    }
  } else {
    // For other status changes (canceled, expired, failed, etc.)
    const { error: updateError } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', sale.id);

    if (updateError) {
      console.error('Error updating sale status:', updateError);
      throw updateError;
    }
  }

  console.log('Status change processed successfully');
}

async function processRefund(
  supabase: any, 
  sale: any, 
  refundData: any, 
  platformFeePercentage: number
) {
  console.log('Processing refund');

  // Idempotency check
  if (sale.status === 'refunded') {
    console.log('Sale already marked as refunded, skipping');
    return;
  }

  const wasAlreadyPaid = sale.status === 'paid';
  
  // Update sale status to refunded
  const { error: updateError } = await supabase
    .from('sales')
    .update({
      status: 'refunded',
      updated_at: new Date().toISOString()
    })
    .eq('id', sale.id);

  if (updateError) {
    console.error('Error updating sale to refunded:', updateError);
    throw updateError;
  }

  // If the sale was previously paid, reverse the producer balance
  if (wasAlreadyPaid && sale.producer_share_cents > 0) {
    const producerId = sale.product?.producer_id;
    if (producerId) {
      console.log('Reversing producer balance for refund:', {
        producer_id: producerId,
        amount_to_subtract: sale.producer_share_cents
      });

      const { error: balanceError } = await supabase
        .from('producer_financials')
        .update({
          available_balance_cents: supabase.raw(`available_balance_cents - ${sale.producer_share_cents}`),
          updated_at: new Date().toISOString()
        })
        .eq('producer_id', producerId);

      if (balanceError) {
        console.error('Error reversing producer balance:', balanceError);
        // Log but don't throw - the refund status was already updated
      } else {
        console.log('Producer balance reversed successfully');
      }
    }
  }

  console.log('Refund processed successfully');
}
