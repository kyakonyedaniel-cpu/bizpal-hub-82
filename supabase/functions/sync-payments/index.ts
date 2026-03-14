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

async function activatePremium(supabase: any, userId: string) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  await supabase.from('profiles')
    .update({ plan: 'premium' })
    .eq('user_id', userId);

  await supabase.from('subscriptions').insert({
    user_id: userId,
    plan: 'premium',
    status: 'active',
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  });

  // Handle referral reward
  const { data: referral } = await supabase.from('referrals')
    .select('*')
    .eq('referred_user_id', userId)
    .eq('reward_status', 'pending')
    .single();

  if (referral) {
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

    // Extend new user by 7 days too
    const newUserEnd = new Date(endDate);
    newUserEnd.setDate(newUserEnd.getDate() + 7);
    await supabase.from('subscriptions')
      .update({ end_date: newUserEnd.toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active');

    await supabase.from('referrals')
      .update({ reward_status: 'rewarded' })
      .eq('id', referral.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Optional: if called manually by a user, verify auth
    const authHeader = req.headers.get('Authorization');
    let callerUserId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ') && !authHeader.includes(Deno.env.get('SUPABASE_ANON_KEY')!)) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      callerUserId = user?.id || null;
    }

    // Fetch all pending AND failed payments
    const { data: pendingPayments, error: fetchErr } = await supabase
      .from('payments')
      .select('*')
      .in('status', ['pending', 'failed']);

    if (fetchErr) throw fetchErr;
    if (!pendingPayments || pendingPayments.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: 'No pending payments found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Note: Without order_tracking_id stored, we can't query Pesapal for individual tx status.
    // Instead, we check if any subscription was already activated for this user (IPN may have fired).
    // For payments older than 1 hour still pending, mark as failed.
    
    let completed = 0;
    let failed = 0;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Try to get Pesapal token for live verification
    let pesapalToken: string | null = null;
    try {
      pesapalToken = await getPesapalToken();
    } catch (e) {
      console.warn('Could not get Pesapal token, falling back to local checks:', e.message);
    }

    for (const payment of pendingPayments) {
      // Check if user already has an active premium subscription created after payment
      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', payment.user_id)
        .eq('status', 'active')
        .eq('plan', 'premium')
        .gte('created_at', payment.created_at)
        .limit(1);

      if (activeSub && activeSub.length > 0 && payment.status !== 'failed') {
        await supabase.from('payments')
          .update({ status: 'completed' })
          .eq('id', payment.id);
        completed++;
        continue;
      }

      // Try live Pesapal verification using order_tracking_id (payment id)
      if (pesapalToken) {
        try {
          const statusRes = await fetch(
            `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${payment.id}`,
            { headers: { 'Authorization': `Bearer ${pesapalToken}`, 'Accept': 'application/json' } }
          );
          const statusData = await statusRes.json();
          const pesapalStatus = (statusData.payment_status_description || '').toLowerCase();

          if (pesapalStatus === 'completed') {
            // Prevent duplicate activation
            if (!activeSub || activeSub.length === 0) {
              await activatePremium(supabase, payment.user_id);
            }
            await supabase.from('payments')
              .update({ status: 'completed' })
              .eq('id', payment.id);
            completed++;
            continue;
          } else if (['failed', 'cancelled', 'invalid'].includes(pesapalStatus)) {
            await supabase.from('payments')
              .update({ status: 'failed' })
              .eq('id', payment.id);
            failed++;
            continue;
          }
          // Still pending/processing at Pesapal — fall through to time-based logic
        } catch (e) {
          console.warn(`Pesapal status check failed for payment ${payment.id}:`, e.message);
        }
      }

      // Fallback: time-based logic for pending payments only
      if (payment.status === 'pending') {
        const paymentDate = new Date(payment.created_at);
        if (paymentDate < oneHourAgo) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('user_id', payment.user_id)
            .single();

          if (profile?.plan === 'premium') {
            await supabase.from('payments')
              .update({ status: 'completed' })
              .eq('id', payment.id);
            completed++;
          } else {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (paymentDate < twentyFourHoursAgo) {
              await supabase.from('payments')
                .update({ status: 'failed' })
                .eq('id', payment.id);
              failed++;
            }
          }
        }
      }
      // Failed payments without Pesapal confirmation stay as-is
    }

    console.log(`Payment sync: ${completed} completed, ${failed} failed, ${pendingPayments.length - completed - failed} still pending`);

    return new Response(JSON.stringify({ 
      synced: pendingPayments.length,
      completed,
      failed,
      still_pending: pendingPayments.length - completed - failed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Payment sync error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
