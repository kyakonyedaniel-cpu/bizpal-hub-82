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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if this is a test request for a specific user
    let targetUserId: string | null = null;
    if (req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) targetUserId = user.id;
      }
    }

    // Get profiles with WhatsApp reports enabled (or specific user for test)
    let profilesQuery = supabase.from('profiles').select('*');
    if (targetUserId) {
      profilesQuery = profilesQuery.eq('user_id', targetUserId);
    } else {
      profilesQuery = profilesQuery.eq('whatsapp_reports_enabled', true).not('whatsapp_number', 'is', null);
    }
    const { data: profiles } = await profilesQuery;

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with WhatsApp reports enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const reports: { userId: string; phone: string; message: string }[] = [];

    for (const profile of profiles) {
      // Fetch today's sales
      const { data: sales } = await supabase
        .from('sales')
        .select('*, products(name)')
        .eq('user_id', profile.user_id)
        .gte('sale_date', startOfDay)
        .lt('sale_date', endOfDay);

      // Fetch today's expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', profile.user_id)
        .gte('expense_date', startOfDay)
        .lt('expense_date', endOfDay);

      // Fetch low stock products
      const { data: lowStock } = await supabase
        .from('products')
        .select('name, stock_quantity, low_stock_threshold')
        .eq('user_id', profile.user_id)
        .filter('stock_quantity', 'lte', 'low_stock_threshold');

      // Actually we can't use column comparison in PostgREST filter, let's fetch all and filter
      const { data: allProducts } = await supabase
        .from('products')
        .select('name, stock_quantity, low_stock_threshold')
        .eq('user_id', profile.user_id);

      const lowStockProducts = (allProducts || []).filter(p => p.stock_quantity <= p.low_stock_threshold);

      const totalSales = (sales || []).reduce((sum, s) => sum + Number(s.total_amount), 0);
      const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
      const profit = totalSales - totalExpenses;

      // Find top product
      const productSales: Record<string, { name: string; total: number }> = {};
      for (const sale of (sales || [])) {
        const name = sale.products?.name || 'Unknown';
        if (!productSales[name]) productSales[name] = { name, total: 0 };
        productSales[name].total += Number(sale.total_amount);
      }
      const topProduct = Object.values(productSales).sort((a, b) => b.total - a.total)[0];

      const dateStr = today.toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      const lowStockText = lowStockProducts.length > 0
        ? lowStockProducts.map(p => `⚠️ ${p.name}: ${p.stock_quantity} left`).join('\n')
        : '✅ All items well stocked';

      const formatUGX = (n: number) => `UGX ${n.toLocaleString()}`;

      const message = `📊 *BizPal Daily Report*\n\n📅 ${dateStr}\n\n💰 Total Sales: ${formatUGX(totalSales)}\n💸 Total Expenses: ${formatUGX(totalExpenses)}\n📈 Profit: ${formatUGX(profit)}\n\n🏆 Top Product: ${topProduct ? `${topProduct.name} (${formatUGX(topProduct.total)})` : 'No sales today'}\n\n📦 *Low Stock Warning:*\n${lowStockText}\n\n_Powered by BizPal Hub_\nManage your business smarter:\nhttps://bizpal-hub-82.lovable.app`;

      const phone = profile.whatsapp_number?.replace(/[^0-9]/g, '') || '';
      if (phone || targetUserId) {
        reports.push({ userId: profile.user_id, phone, message });
      }
    }

    return new Response(JSON.stringify({ reports, count: reports.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
