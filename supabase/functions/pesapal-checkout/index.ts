import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PESAPAL_BASE_URL = 'https://pay.pesapal.com/v3';

async function getPesapalToken(): Promise<string> {
  const res = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      consumer_key: Deno.env.get('PESAPAL_CONSUMER_KEY'),
      consumer_secret: Deno.env.get('PESAPAL_CONSUMER_SECRET'),
    }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Failed to get Pesapal token');
  return data.token;
}

async function registerIPN(token: string): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const ipnUrl = `${supabaseUrl}/functions/v1/pesapal-ipn`;
  
  const res = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: 'GET',
    }),
  });
  const data = await res.json();
  if (!data.ipn_id) throw new Error('Failed to register IPN');
  return data.ipn_id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = user.id;
    const { user_id, email, amount, currency } = await req.json();
    
    if (user_id !== userId) {
      return new Response(JSON.stringify({ error: 'User mismatch' }), { status: 403, headers: corsHeaders });
    }

    const pesapalToken = await getPesapalToken();
    const ipnId = await registerIPN(pesapalToken);

    const merchantRef = `BIZPAL-${userId.slice(0, 8)}-${Date.now()}`;
    const callbackUrl = `${req.headers.get('origin') || 'https://bizpal-hub-82.lovable.app'}/subscription?payment=complete`;

    const orderRes = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${pesapalToken}`,
      },
      body: JSON.stringify({
        id: merchantRef,
        currency: currency || 'UGX',
        amount: amount || 2000,
        description: 'SmartBiz Premium Subscription - 1 Month',
        callback_url: callbackUrl,
        notification_id: ipnId,
        billing_address: {
          email_address: email,
        },
      }),
    });

    const orderData = await orderRes.json();

    if (!orderData.redirect_url) {
      console.error('Pesapal order error:', orderData);
      return new Response(JSON.stringify({ error: 'Failed to create payment order', details: orderData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store pending payment
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await adminClient.from('payments').insert({
      user_id: userId,
      amount: amount || 2000,
      currency: currency || 'UGX',
      payment_method: 'Pesapal',
      status: 'pending',
    });

    return new Response(JSON.stringify({
      redirect_url: orderData.redirect_url,
      order_tracking_id: orderData.order_tracking_id,
      merchant_reference: merchantRef,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Pesapal checkout error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
