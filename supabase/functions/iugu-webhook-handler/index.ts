
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
    console.log('*** DEBUG WEBHOOK: Webhook received from Iugu ***');
    console.log('*** DEBUG WEBHOOK: Method:', req.method);
    console.log('*** DEBUG WEBHOOK: Headers:', Object.fromEntries(req.headers.entries()));
    
    // Extract sale_id from URL query string
    const url = new URL(req.url);
    const saleIdFromUrl = url.searchParams.get('sale_id');
    console.log('*** DEBUG WEBHOOK: sale_id extraído da URL:', saleIdFromUrl);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get platform fee percentage
    const platformFeePercentage = parseFloat(Deno.env.get('PLATFORM_FEE_PERCENTAGE') || '0.05');

    // Detect Content-Type and parse payload accordingly
    const contentType = req.headers.get('content-type') || '';
    console.log('*** DEBUG WEBHOOK: Content-Type detected:', contentType);
    
    let payload: IuguWebhookPayload;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      console.log('*** DEBUG WEBHOOK: Processing form-urlencoded payload ***');
      
      // Read as form data
      const formDataText = await req.text();
      console.log('*** DEBUG WEBHOOK: Raw form data:', formDataText);
      
      const params = new URLSearchParams(formDataText);
      console.log('*** DEBUG WEBHOOK: Parsed form params:', Object.fromEntries(params.entries()));
      
      // Extract event
      const event = params.get('event');
      if (!event) {
        console.error('*** ERRO WEBHOOK: Missing event parameter in form data ***');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Missing event parameter',
            functionName: 'iugu-webhook-handler'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Reconstruct data object from form parameters
      const data: any = {};
      
      // Extract all data[key] parameters
      for (const [key, value] of params.entries()) {
        if (key.startsWith('data[') && key.endsWith(']')) {
          const dataKey = key.slice(5, -1); // Remove 'data[' and ']'
          data[dataKey] = value;
        }
      }

      console.log('*** DEBUG WEBHOOK: Extracted data object:', data);

      // Create payload object
      payload = {
        event: event,
        data: data,
        webhook_id: params.get('webhook_id') || undefined
      };

      console.log('*** DEBUG WEBHOOK: Reconstructed payload from form data:', JSON.stringify(payload, null, 2));

    } else if (contentType.includes('application/json')) {
      console.log('*** DEBUG WEBHOOK: Processing JSON payload ***');
      
      payload = await req.json();
      console.log('*** DEBUG WEBHOOK: Parsed JSON payload:', JSON.stringify(payload, null, 2));

    } else {
      console.error('*** ERRO WEBHOOK: Unsupported Content-Type:', contentType);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Unsupported Content-Type. Expected application/json or application/x-www-form-urlencoded',
          contentType: contentType,
          functionName: 'iugu-webhook-handler'
        }),
        { 
          status: 415, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('*** DEBUG WEBHOOK: Final payload for processing:', {
      event: payload.event,
      data_id: payload.data?.id,
      status: payload.data?.status,
      webhook_id: payload.webhook_id,
      sale_id_from_url: saleIdFromUrl
    });

    const { event, data } = payload;

    // Handle subscription-specific events
    if (event.startsWith('subscription.')) {
      return await handleSubscriptionEvent(supabase, event, data);
    }

    // Handle invoice events (existing logic)
    const iuguInvoiceId = data.id;
    const iuguChargeId = data.id;

    // Find the sale in our database - prioritize sale_id from URL
    let saleQuery = supabase.from('sales').select(`
      *,
      product:products(
        id,
        producer_id,
        name
      )
    `);

    // Use sale_id from URL if available, otherwise search by iugu identifiers
    if (saleIdFromUrl) {
      console.log('*** DEBUG WEBHOOK: Buscando sale pelo sale_id da URL:', saleIdFromUrl);
      saleQuery = saleQuery.eq('id', saleIdFromUrl);
    } else {
      console.log('*** DEBUG WEBHOOK: Buscando sale pelos IDs da Iugu:', { iuguInvoiceId, iuguChargeId });
      saleQuery = saleQuery.or(`iugu_invoice_id.eq.${iuguInvoiceId},iugu_charge_id.eq.${iuguChargeId}`);
    }

    const { data: sale, error: saleError } = await saleQuery.single();

    if (saleError || !sale) {
      console.error('*** ERRO WEBHOOK: Sale not found for webhook:', {
        iuguInvoiceId,
        iuguChargeId,
        saleIdFromUrl,
        error: saleError
      });
      
      // Return 200 to prevent Iugu from retrying this webhook
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook received but sale not found in our system',
          functionName: 'iugu-webhook-handler'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('*** DEBUG WEBHOOK: Found sale:', {
      sale_id: sale.id,
      current_status: sale.status,
      current_iugu_status: sale.iugu_status,
      new_iugu_status: data.status,
      product_id: sale.product_id,
      producer_id: sale.product?.producer_id,
      is_subscription: !!sale.iugu_subscription_id
    });

    // Process different webhook events
    if (event === 'invoice.status_changed' || event === 'invoice.created') {
      await processInvoiceStatusChange(supabase, sale, data, platformFeePercentage);
    } else if (event === 'invoice.refund') {
      await processRefund(supabase, sale, data, platformFeePercentage);
    } else {
      console.log('*** DEBUG WEBHOOK: Unhandled webhook event:', event);
      // Still update the iugu_status if it's different
      if (sale.iugu_status !== data.status) {
        await supabase
          .from('sales')
          .update({ iugu_status: data.status })
          .eq('id', sale.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        sale_id: sale.id,
        event: event,
        iugu_status: data.status,
        functionName: 'iugu-webhook-handler'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('*** ERRO WEBHOOK: Error processing webhook:', error.message);
    console.error('*** ERRO WEBHOOK: Stack trace:', error.stack);
    console.error('*** ERRO WEBHOOK: Full error:', error);
    
    // Still return 200 to prevent unnecessary retries from Iugu
    // Log the error but don't let it cause webhook failures
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal error processing webhook',
        error: error.message,
        functionName: 'iugu-webhook-handler'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleSubscriptionEvent(supabase: any, event: string, data: any) {
  console.log('*** DEBUG WEBHOOK: Processing subscription event:', event, 'with data:', data);

  const subscriptionId = data.id;
  if (!subscriptionId) {
    console.error('*** ERRO WEBHOOK: Missing subscription ID in subscription event');
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Missing subscription ID',
        functionName: 'iugu-webhook-handler'
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Find the sale with this subscription ID
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('*')
    .eq('iugu_subscription_id', subscriptionId)
    .single();

  if (saleError || !sale) {
    console.error('*** ERRO WEBHOOK: Sale not found for subscription:', subscriptionId, saleError);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Subscription webhook received but sale not found',
        functionName: 'iugu-webhook-handler'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  let newStatus: string;
  let newIuguStatus: string;
  
  switch (event) {
    case 'subscription.created':
      newStatus = 'pending_payment';
      newIuguStatus = 'pending';
      break;
    case 'subscription.activated':
      newStatus = 'paid';
      newIuguStatus = 'active';
      break;
    case 'subscription.suspended':
    case 'subscription.expired':
      newStatus = 'expired';
      newIuguStatus = 'expired';
      break;
    case 'subscription.canceled':
      newStatus = 'cancelled';
      newIuguStatus = 'cancelled';
      break;
    default:
      console.log('*** DEBUG WEBHOOK: Unhandled subscription event:', event);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Unhandled subscription event',
          functionName: 'iugu-webhook-handler'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
  }

  console.log('*** DEBUG WEBHOOK: Updating subscription status:', {
    sale_id: sale.id,
    subscription_id: subscriptionId,
    old_status: sale.status,
    old_iugu_status: sale.iugu_status,
    new_status: newStatus,
    new_iugu_status: newIuguStatus
  });

  // Update the subscription status
  const { error: updateError } = await supabase
    .from('sales')
    .update({ 
      status: newStatus,
      iugu_status: newIuguStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', sale.id);

  if (updateError) {
    console.error('*** ERRO WEBHOOK: Error updating subscription status:', updateError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error updating subscription status',
        functionName: 'iugu-webhook-handler'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  console.log('*** DEBUG WEBHOOK: Subscription status updated successfully');

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Subscription webhook processed successfully',
      sale_id: sale.id,
      event: event,
      new_status: newStatus,
      new_iugu_status: newIuguStatus,
      functionName: 'iugu-webhook-handler'
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function processInvoiceStatusChange(
  supabase: any, 
  sale: any, 
  invoiceData: any, 
  platformFeePercentage: number
) {
  const newIuguStatus = invoiceData.status;
  const currentStatus = sale.status;
  const currentIuguStatus = sale.iugu_status;
  const isSubscription = !!sale.iugu_subscription_id;

  console.log('*** DEBUG WEBHOOK: Processing status change:', { 
    currentStatus, 
    currentIuguStatus,
    newIuguStatus, 
    isSubscription,
    subscriptionId: sale.iugu_subscription_id 
  });

  // Idempotency check - if iugu_status hasn't changed, do nothing
  if (currentIuguStatus === newIuguStatus) {
    console.log('*** DEBUG WEBHOOK: Iugu status unchanged, skipping processing');
    return;
  }

  // Update the sale iugu_status
  const updateData: any = {
    iugu_status: newIuguStatus,
    updated_at: new Date().toISOString()
  };

  // For invoice.created event, update iugu_invoice_id if not already set
  if (invoiceData.id && !sale.iugu_invoice_id) {
    updateData.iugu_invoice_id = invoiceData.id;
    console.log('*** DEBUG WEBHOOK: Updating iugu_invoice_id:', invoiceData.id);
  }

  // Determinar o novo status interno com base no status da Iugu
  if (newIuguStatus === 'paid') {
    if (isSubscription) {
      // Para assinaturas, quando a fatura é paga, a assinatura fica PAGA
      updateData.status = 'paid';
      console.log('*** DEBUG WEBHOOK: Subscription invoice paid - setting status to PAID');
    } else {
      // Para vendas normais, quando a fatura é paga, a venda fica PAGA
      updateData.status = 'paid';
      console.log('*** DEBUG WEBHOOK: Regular sale invoice paid - setting status to PAID');
    }
  } else if (newIuguStatus === 'pending') {
    updateData.status = 'pending_payment';
  } else if (newIuguStatus === 'cancelled' || newIuguStatus === 'canceled') {
    updateData.status = 'cancelled';
  } else if (newIuguStatus === 'expired') {
    updateData.status = 'expired';
  } else if (newIuguStatus === 'failed') {
    updateData.status = 'failed';
  } else {
    // Para outros status, manter o status atual
    console.log('*** DEBUG WEBHOOK: Unknown iugu_status, keeping current status:', newIuguStatus);
  }

  // If payment is confirmed (paid status) and wasn't paid before
  if (newIuguStatus === 'paid' && currentIuguStatus !== 'paid') {
    console.log('*** DEBUG WEBHOOK: Processing payment confirmation');
    
    updateData.paid_at = new Date().toISOString();

    // Calculate fees and release date
    const amountTotalCents = sale.amount_total_cents;
    const platformFeeCents = Math.round(amountTotalCents * platformFeePercentage);
    const securityReserveCents = Math.round(amountTotalCents * 0.1); // 10% security reserve
    const producerShareCents = amountTotalCents - platformFeeCents - securityReserveCents;
    
    // Calculate release date (30 days from payment)
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + 30);

    // Update sale with payment info
    updateData.platform_fee_cents = platformFeeCents;
    updateData.producer_share_cents = producerShareCents;
    updateData.security_reserve_cents = securityReserveCents;
    updateData.release_date = releaseDate.toISOString().split('T')[0]; // Format as DATE

    console.log('*** DEBUG WEBHOOK: Calculated payment values:', {
      amountTotalCents,
      platformFeeCents,
      securityReserveCents,
      producerShareCents,
      releaseDate: updateData.release_date
    });

    // Update sale record
    const { error: updateError } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', sale.id);

    if (updateError) {
      console.error('*** ERRO WEBHOOK: Error updating sale:', updateError);
      throw updateError;
    }

    // Update producer balance - only add the producer share (not the security reserve)
    const producerId = sale.product?.producer_id;
    if (producerId) {
      console.log('*** DEBUG WEBHOOK: Updating producer balance:', {
        producer_id: producerId,
        amount_to_add: producerShareCents
      });

      // Try to get current balance first
      const { data: producerData, error: getBalanceError } = await supabase
        .from('producer_financials')
        .select('available_balance_cents')
        .eq('producer_id', producerId)
        .single();

      if (getBalanceError && getBalanceError.code === 'PGRST116') {
        // No existing record, create new one
        console.log('*** DEBUG WEBHOOK: Producer financials record not found, creating new one ***');
        
        const { error: insertError } = await supabase
          .from('producer_financials')
          .insert({
            producer_id: producerId,
            available_balance_cents: producerShareCents,
            pending_balance_cents: 0,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('*** ERRO WEBHOOK: Error creating producer financials record:', insertError);
        } else {
          console.log('*** DEBUG WEBHOOK: Producer financials record created successfully:', {
            producer_id: producerId,
            initial_balance: producerShareCents
          });
        }
      } else if (getBalanceError) {
        console.error('*** ERRO WEBHOOK: Error getting producer balance:', getBalanceError);
      } else {
        // Record exists, update it
        const currentBalance = producerData.available_balance_cents;
        const newBalance = currentBalance + producerShareCents;

        console.log('*** DEBUG WEBHOOK: Balance calculation:', {
          current_balance: currentBalance,
          amount_to_add: producerShareCents,
          new_balance: newBalance
        });

        // Update the balance
        const { error: balanceError } = await supabase
          .from('producer_financials')
          .update({
            available_balance_cents: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('producer_id', producerId);

        if (balanceError) {
          console.error('*** ERRO WEBHOOK: Error updating producer balance:', balanceError);
        } else {
          console.log('*** DEBUG WEBHOOK: Producer balance updated successfully:', {
            producer_id: producerId,
            new_balance: newBalance
          });
        }
      }
    }
  } else {
    // For other status changes just update the status
    const { error: updateError } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', sale.id);

    if (updateError) {
      console.error('*** ERRO WEBHOOK: Error updating sale status:', updateError);
      throw updateError;
    }
  }

  console.log('*** DEBUG WEBHOOK: Status change processed successfully');
}

async function processRefund(
  supabase: any, 
  sale: any, 
  refundData: any, 
  platformFeePercentage: number
) {
  console.log('*** DEBUG WEBHOOK: Processing refund');

  // Idempotency check
  if (sale.status === 'refunded') {
    console.log('*** DEBUG WEBHOOK: Sale already marked as refunded, skipping');
    return;
  }

  const wasAlreadyPaid = sale.status === 'paid';
  
  // Update sale status to refunded
  const { error: updateError } = await supabase
    .from('sales')
    .update({
      status: 'refunded',
      iugu_status: 'refunded',
      updated_at: new Date().toISOString()
    })
    .eq('id', sale.id);

  if (updateError) {
    console.error('*** ERRO WEBHOOK: Error updating sale to refunded:', updateError);
    throw updateError;
  }

  // If the sale was previously paid, reverse the producer balance
  if (wasAlreadyPaid && sale.producer_share_cents > 0) {
    const producerId = sale.product?.producer_id;
    if (producerId) {
      console.log('*** DEBUG WEBHOOK: Reversing producer balance for refund:', {
        producer_id: producerId,
        amount_to_subtract: sale.producer_share_cents
      });

      // First, get current balance
      const { data: producerData, error: getBalanceError } = await supabase
        .from('producer_financials')
        .select('available_balance_cents')
        .eq('producer_id', producerId)
        .single();

      if (getBalanceError && getBalanceError.code !== 'PGRST116') {
        console.error('*** ERRO WEBHOOK: Error getting producer balance for refund:', getBalanceError);
      } else {
        const currentBalance = producerData ? producerData.available_balance_cents : 0;
        const newBalance = currentBalance - sale.producer_share_cents;

        // Update the balance
        const { error: balanceError } = await supabase
          .from('producer_financials')
          .update({
            available_balance_cents: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('producer_id', producerId);

        if (balanceError) {
          console.error('*** ERRO WEBHOOK: Error reversing producer balance:', balanceError);
          // Log but don't throw - the refund status was already updated
        } else {
          console.log('*** DEBUG WEBHOOK: Producer balance reversed successfully:', {
            producer_id: producerId,
            new_balance: newBalance
          });
        }
      }
    }
  }

  console.log('*** DEBUG WEBHOOK: Refund processed successfully');
}
