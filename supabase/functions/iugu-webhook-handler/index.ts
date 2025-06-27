
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

interface PlatformSettings {
  default_pix_fee_percent: number;
  default_boleto_fee_percent: number;
  default_card_installments_fees: any;
  default_pix_release_days: number;
  default_boleto_release_days: number;
  default_card_release_days: number;
  default_security_reserve_percent: number;
  default_anticipation_fee_percent: number;
}

interface ProducerSettings {
  custom_pix_fee_percent?: number;
  custom_boleto_fee_percent?: number;
  custom_card_installments_fees?: any;
  custom_pix_release_days?: number;
  custom_boleto_release_days?: number;
  custom_card_release_days?: number;
  custom_security_reserve_percent?: number;
  custom_anticipation_fee_percent?: number;
}

interface FinalSettings {
  pix_fee_percent: number;
  boleto_fee_percent: number;
  card_installments_fees: any;
  pix_release_days: number;
  boleto_release_days: number;
  card_release_days: number;
  security_reserve_percent: number;
  anticipation_fee_percent: number;
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
      new_status: data.status,
      product_id: sale.product_id,
      producer_id: sale.product?.producer_id,
      is_subscription: !!sale.iugu_subscription_id
    });

    // Process different webhook events
    if (event === 'invoice.status_changed' || event === 'invoice.created') {
      await processInvoiceStatusChange(supabase, sale, data);
    } else if (event === 'invoice.refund') {
      await processRefund(supabase, sale, data, platformFeePercentage);
    } else {
      console.log('*** DEBUG WEBHOOK: Unhandled webhook event:', event);
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
        status: data.status,
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
  
  switch (event) {
    case 'subscription.created':
      newStatus = 'pending';
      break;
    case 'subscription.activated':
      newStatus = 'active';
      break;
    case 'subscription.suspended':
    case 'subscription.expired':
      newStatus = 'expired';
      break;
    case 'subscription.canceled':
      newStatus = 'canceled';
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
    new_status: newStatus
  });

  // Update the subscription status
  const { error: updateError } = await supabase
    .from('sales')
    .update({ 
      status: newStatus,
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
  invoiceData: any
) {
  const newStatus = invoiceData.status;
  const currentStatus = sale.status;
  const isSubscription = !!sale.iugu_subscription_id;

  console.log('*** DEBUG WEBHOOK: Processing status change:', { 
    currentStatus, 
    newStatus, 
    isSubscription,
    subscriptionId: sale.iugu_subscription_id 
  });

  // Idempotency check - if status hasn't changed, do nothing
  if (currentStatus === newStatus) {
    console.log('*** DEBUG WEBHOOK: Status unchanged, skipping processing');
    return;
  }

  // Update the sale status
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  // For invoice.created event, update iugu_invoice_id if not already set
  if (invoiceData.id && !sale.iugu_invoice_id) {
    updateData.iugu_invoice_id = invoiceData.id;
    console.log('*** DEBUG WEBHOOK: Updating iugu_invoice_id:', invoiceData.id);
  }

  // Update the iugu_status
  updateData.iugu_status = newStatus;

  // ENHANCED LOGIC: If payment is confirmed (paid status), calculate fees and financial data
  if (newStatus === 'paid' && currentStatus !== 'paid') {
    console.log('*** DEBUG WEBHOOK: Processing payment confirmation with financial calculations');
    
    try {
      // Get producer_id from the sale
      const producerId = sale.product?.producer_id;
      if (!producerId) {
        console.error('*** ERRO WEBHOOK: Producer ID not found in sale');
        throw new Error('Producer ID not found in sale');
      }

      console.log('*** DEBUG WEBHOOK: Producer ID found:', producerId);

      // Get financial settings (producer custom settings or platform defaults)
      const finalSettings = await getFinancialSettings(supabase, producerId);
      console.log('*** DEBUG WEBHOOK: Final settings obtained:', finalSettings);

      // Calculate financial values
      const paymentMethod = sale.payment_method_used;
      const installments = sale.installments_chosen || 1;
      const amountTotalCents = sale.amount_total_cents;

      console.log('*** DEBUG WEBHOOK: Calculating fees with:', {
        paymentMethod,
        installments,
        amountTotalCents
      });

      const platformFeeCents = calculatePlatformFee(finalSettings, paymentMethod, installments, amountTotalCents);
      const producerShareCents = amountTotalCents - platformFeeCents;
      const securityReserveCents = Math.round(amountTotalCents * (finalSettings.security_reserve_percent / 100));
      
      // Calculate release date
      const releaseDate = calculateReleaseDate(finalSettings, paymentMethod);

      console.log('*** DEBUG WEBHOOK: Calculated financial values:', {
        platformFeeCents,
        producerShareCents,
        securityReserveCents,
        releaseDate
      });

      // Set status based on transaction type
      if (isSubscription) {
        updateData.status = 'active'; // Subscription becomes active when paid
      } else {
        updateData.status = 'paid'; // Regular sale becomes paid
      }

      // Update financial fields
      updateData.paid_at = new Date().toISOString();
      updateData.payout_status = 'pending';
      updateData.release_date = releaseDate;
      updateData.platform_fee_cents = platformFeeCents;
      updateData.producer_share_cents = producerShareCents;
      updateData.security_reserve_cents = securityReserveCents;

    } catch (error) {
      console.error('*** ERRO WEBHOOK: Error calculating financial data:', error);
      // Fall back to simple status update
      if (isSubscription) {
        updateData.status = 'active';
      } else {
        updateData.status = 'paid';
      }
    }
  } else {
    // For other status changes, determine appropriate status
    if (isSubscription) {
      if (newStatus === 'paid') {
        updateData.status = 'active';
      } else {
        updateData.status = newStatus;
      }
    } else {
      updateData.status = newStatus;
    }
  }

  // Update sale record
  const { error: updateError } = await supabase
    .from('sales')
    .update(updateData)
    .eq('id', sale.id);

  if (updateError) {
    console.error('*** ERRO WEBHOOK: Error updating sale:', updateError);
    throw updateError;
  }

  // Update producer balance if payment was confirmed
  if (newStatus === 'paid' && currentStatus !== 'paid' && updateData.producer_share_cents) {
    const producerId = sale.product?.producer_id;
    if (producerId) {
      console.log('*** DEBUG WEBHOOK: Updating producer balance:', {
        producer_id: producerId,
        amount_to_add: updateData.producer_share_cents
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
            available_balance_cents: updateData.producer_share_cents,
            pending_balance_cents: 0,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('*** ERRO WEBHOOK: Error creating producer financials record:', insertError);
        } else {
          console.log('*** DEBUG WEBHOOK: Producer financials record created successfully:', {
            producer_id: producerId,
            initial_balance: updateData.producer_share_cents
          });
        }
      } else if (getBalanceError) {
        console.error('*** ERRO WEBHOOK: Error getting producer balance:', getBalanceError);
      } else {
        // Record exists, update it
        const currentBalance = producerData.available_balance_cents;
        const newBalance = currentBalance + updateData.producer_share_cents;

        console.log('*** DEBUG WEBHOOK: Balance calculation:', {
          current_balance: currentBalance,
          amount_to_add: updateData.producer_share_cents,
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
  }

  console.log('*** DEBUG WEBHOOK: Status change processed successfully');
}

async function getFinancialSettings(supabase: any, producerId: string): Promise<FinalSettings> {
  console.log('*** DEBUG WEBHOOK: Getting financial settings for producer:', producerId);

  // First, try to get producer custom settings
  const { data: producerSettings, error: producerError } = await supabase
    .from('producer_settings')
    .select('*')
    .eq('producer_id', producerId)
    .single();

  if (producerError && producerError.code !== 'PGRST116') {
    console.error('*** ERROR WEBHOOK: Error fetching producer settings:', producerError);
  }

  console.log('*** DEBUG WEBHOOK: Producer settings:', producerSettings);

  // Get platform default settings
  const { data: platformSettings, error: platformError } = await supabase
    .from('platform_settings')
    .select('*')
    .single();

  if (platformError) {
    console.error('*** ERROR WEBHOOK: Error fetching platform settings:', platformError);
    throw new Error('Could not fetch platform settings');
  }

  console.log('*** DEBUG WEBHOOK: Platform settings:', platformSettings);

  // Create final settings object (producer custom overrides platform defaults)
  const finalSettings: FinalSettings = {
    pix_fee_percent: producerSettings?.custom_pix_fee_percent ?? platformSettings.default_pix_fee_percent ?? 5.0,
    boleto_fee_percent: producerSettings?.custom_boleto_fee_percent ?? platformSettings.default_boleto_fee_percent ?? 5.0,
    card_installments_fees: producerSettings?.custom_card_installments_fees ?? platformSettings.default_card_installments_fees ?? {"1": 5.0},
    pix_release_days: producerSettings?.custom_pix_release_days ?? platformSettings.default_pix_release_days ?? 2,
    boleto_release_days: producerSettings?.custom_boleto_release_days ?? platformSettings.default_boleto_release_days ?? 2,
    card_release_days: producerSettings?.custom_card_release_days ?? platformSettings.default_card_release_days ?? 15,
    security_reserve_percent: producerSettings?.custom_security_reserve_percent ?? platformSettings.default_security_reserve_percent ?? 10.0,
    anticipation_fee_percent: producerSettings?.custom_anticipation_fee_percent ?? platformSettings.default_anticipation_fee_percent ?? 5.0
  };

  console.log('*** DEBUG WEBHOOK: Final merged settings:', finalSettings);
  return finalSettings;
}

function calculatePlatformFee(settings: FinalSettings, paymentMethod: string, installments: number, amountCents: number): number {
  console.log('*** DEBUG WEBHOOK: Calculating platform fee:', { paymentMethod, installments, amountCents });

  let feePercent = 5.0; // Default fallback

  switch (paymentMethod.toLowerCase()) {
    case 'pix':
      feePercent = settings.pix_fee_percent;
      break;
    case 'bank_slip':
    case 'boleto':
      feePercent = settings.boleto_fee_percent;
      break;
    case 'credit_card':
    case 'card':
      const installmentKey = installments.toString();
      feePercent = settings.card_installments_fees[installmentKey] ?? settings.card_installments_fees["1"] ?? 5.0;
      break;
    default:
      console.warn('*** WARNING WEBHOOK: Unknown payment method, using default fee:', paymentMethod);
      feePercent = 5.0;
  }

  const feeCents = Math.round(amountCents * (feePercent / 100));
  console.log('*** DEBUG WEBHOOK: Calculated fee:', { feePercent, feeCents });
  
  return feeCents;
}

function calculateReleaseDate(settings: FinalSettings, paymentMethod: string): string {
  console.log('*** DEBUG WEBHOOK: Calculating release date for payment method:', paymentMethod);

  let releaseDays = 15; // Default fallback

  switch (paymentMethod.toLowerCase()) {
    case 'pix':
      releaseDays = settings.pix_release_days;
      break;
    case 'bank_slip':
    case 'boleto':
      releaseDays = settings.boleto_release_days;
      break;
    case 'credit_card':
    case 'card':
      releaseDays = settings.card_release_days;
      break;
    default:
      console.warn('*** WARNING WEBHOOK: Unknown payment method, using default release days:', paymentMethod);
      releaseDays = 15;
  }

  const releaseDate = new Date();
  releaseDate.setDate(releaseDate.getDate() + releaseDays);
  
  const releaseDateString = releaseDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  console.log('*** DEBUG WEBHOOK: Calculated release date:', { releaseDays, releaseDateString });
  
  return releaseDateString;
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

  const wasAlreadyPaid = sale.status === 'paid' || sale.status === 'active';
  
  // Update sale status to refunded
  const { error: updateError } = await supabase
    .from('sales')
    .update({
      status: 'refunded',
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
