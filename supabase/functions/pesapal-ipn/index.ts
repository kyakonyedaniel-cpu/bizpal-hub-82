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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Pesapal sends GET with query params: OrderTrackingId, OrderMerchantReference, OrderNotificationType
    const url = new URL(req.url);
    const orderTrackingId = url.searchParams.get('OrderTrackingId');
    const merchantRef = url.searchParams.get('OrderMerchantReference');

    if (!orderTrackingId) {
      return new Response(JSON.stringify({ error: 'Missing OrderTrackingId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get transaction status from Pesapal
    const pesapalToken = await getPesapalToken();
    const statusRes = await fetch(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${pesapalToken}`,
        },
      }
    );
    const statusData = await statusRes.json();

    console.log('Pesapal IPN status:', JSON.stringify(statusData));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Extract user_id from merchant reference: BIZPAL-{userId8chars}-{timestamp}
    const userId = merchantRef ? await getUserIdFromRef(supabase, merchantRef) : null;

    if (statusData.payment_status_description === 'Completed' && userId) {
      // Update payment status
      await supabase.from('payments')
        .update({ status: 'verified', payment_method: statusData.payment_method || 'Pesapal' })
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      // Activate Premium
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      await supabase.from('profiles')
        .update({ plan: 'premium' })
        .eq('user_id', userId);

      // Upsert subscription
      await supabase.from('subscriptions').insert({
        user_id: userId,
        plan: 'premium',
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      // Check for referral reward
      const { data: profile } = await supabase.from('profiles')
        .select('referral_code')
        .eq('user_id', userId)
        .single();

      // Find if this user was referred
      const { data: referral } = await supabase.from('referrals')
        .select('*')
        .eq('referred_user_id', userId)
        .eq('reward_status', 'pending')
        .single();

      if (referral) {
        // Reward referrer: extend their subscription by 7 days
        const { data: referrerSub } = await supabase.from('subscriptions')
          .select('*')
          .eq('user_id', referral.referrer_user_id)
          .eq('status', 'active')
          .order('end_date', { ascending: false })
          .limit(1)
          .single();

        if (referrerSub) {
          const newEnd = new Date(referrerSub.end_date);
          newEnd.setDate(newEnd.getDate() + 7);
          await supabase.from('subscriptions')
            .update({ end_date: newEnd.toISOString() })
            .eq('id', referrerSub.id);
        } else {
          // Create 7-day premium for referrer
          const refStart = new Date();
          const refEnd = new Date();
          refEnd.setDate(refEnd.getDate() + 7);
          await supabase.from('subscriptions').insert({
            user_id: referral.referrer_user_id,
            plan: 'premium',
            status: 'active',
            start_date: refStart.toISOString(),
            end_date: refEnd.toISOString(),
          });
          await supabase.from('profiles')
            .update({ plan: 'premium' })
            .eq('user_id', referral.referrer_user_id);
        }

        // Extend new user's subscription by 7 days too
        const newUserEnd = new Date(endDate);
        newUserEnd.setDate(newUserEnd.getDate() + 7);
        await supabase.from('subscriptions')
          .update({ end_date: newUserEnd.toISOString() })
          .eq('user_id', userId)
          .eq('status', 'active');

        // Mark referral as rewarded
        await supabase.from('referrals')
          .update({ reward_status: 'rewarded' })
          .eq('id', referral.id);
      }

      console.log(`Premium activated for user ${userId}`);
    } else if (statusData.payment_status_description === 'Failed' && userId) {
      await supabase.from('payments')
        .update({ status: 'failed' })
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
    }

    // Pesapal expects a 200 response
    return new Response(JSON.stringify({ orderNotificationType: 'IPNCHANGE', orderTrackingId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Pesapal IPN error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getUserIdFromRef(supabase: any, merchantRef: string): Promise<string | null> {
  // BIZPAL-{first8chars}-{timestamp}
  const parts = merchantRef.split('-');
  if (parts.length < 3) return null;
  const partialId = parts[1];
  
  // Find user by partial ID match
  const { data } = await supabase.from('profiles')
    .select('user_id')
    .like('user_id', `${partialId}%`)
    .limit(1)
    .single();
  
  return data?.user_id || null;
}
