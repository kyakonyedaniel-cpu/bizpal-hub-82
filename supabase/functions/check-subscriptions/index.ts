import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date().toISOString();

    // Find expired active premium subscriptions
    const { data: expired } = await supabase
      .from('subscriptions')
      .select('user_id, id')
      .eq('status', 'active')
      .eq('plan', 'premium')
      .lt('end_date', now);

    if (expired && expired.length > 0) {
      for (const sub of expired) {
        // Deactivate subscription
        await supabase.from('subscriptions')
          .update({ status: 'expired' })
          .eq('id', sub.id);

        // Check if user has any other active premium subscription
        const { data: otherActive } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', sub.user_id)
          .eq('status', 'active')
          .eq('plan', 'premium')
          .limit(1);

        if (!otherActive || otherActive.length === 0) {
          // Downgrade to free
          await supabase.from('profiles')
            .update({ plan: 'free' })
            .eq('user_id', sub.user_id);
        }
      }
      console.log(`Downgraded ${expired.length} expired subscriptions`);
    }

    return new Response(JSON.stringify({ processed: expired?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Downgrade cron error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
