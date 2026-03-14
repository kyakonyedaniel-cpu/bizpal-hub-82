import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, TrendingUp, ShoppingCart, AlertTriangle, Package, Banknote, Building2, Gift, Copy, Share2 } from 'lucide-react';
import { formatUGX } from '@/lib/currency';
import { format, startOfWeek } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DashboardData {
  totalSales: number;
  totalExpenses: number;
  todaySales: number;
  todaySalesCount: number;
  todayProfit: number;
  weeklyProfit: number;
  lowStockProducts: { name: string; stock_quantity: number }[];
  salesByMethod: { method: string; total: number }[];
  topProfitableProducts: { name: string; profit: number }[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const { currentBranch, allBranchesMode } = useBranch();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData>({
    totalSales: 0, totalExpenses: 0, todaySales: 0, todaySalesCount: 0,
    todayProfit: 0, weeklyProfit: 0,
    lowStockProducts: [], salesByMethod: [], topProfitableProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');

      let salesQuery = supabase.from('sales').select('total_amount, payment_method').eq('user_id', user.id);
      let expensesQuery = supabase.from('expenses').select('amount').eq('user_id', user.id);
      let todaySalesQuery = supabase.from('sales').select('total_amount, sale_profit').eq('user_id', user.id).gte('sale_date', today);
      let weeklySalesQuery = supabase.from('sales').select('sale_profit').eq('user_id', user.id).gte('sale_date', weekStart);
      let productsQuery = supabase.from('products').select('name, stock_quantity, low_stock_threshold').eq('user_id', user.id);
      let profitQuery = supabase.from('sales').select('sale_profit, products(name)').eq('user_id', user.id).gt('sale_profit', 0).order('sale_profit', { ascending: false }).limit(5);

      if (!allBranchesMode && currentBranch) {
        salesQuery = salesQuery.eq('branch_id', currentBranch.id);
        expensesQuery = expensesQuery.eq('branch_id', currentBranch.id);
        todaySalesQuery = todaySalesQuery.eq('branch_id', currentBranch.id);
        weeklySalesQuery = weeklySalesQuery.eq('branch_id', currentBranch.id);
        productsQuery = productsQuery.eq('branch_id', currentBranch.id);
        profitQuery = profitQuery.eq('branch_id', currentBranch.id);
      }

      const [salesRes, expensesRes, todaySalesRes, weeklySalesRes, lowStockRes, profitRes, profileRes, referralsRes, subRes] = await Promise.all([
        salesQuery, expensesQuery, todaySalesQuery, weeklySalesQuery, productsQuery, profitQuery,
        supabase.from('profiles').select('referral_code, plan').eq('user_id', user.id).single(),
        supabase.from('referrals').select('id').eq('referrer_user_id', user.id).eq('reward_status', 'rewarded'),
        supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').eq('plan', 'premium').order('end_date', { ascending: false }).limit(1),
      ]);

      const sales = salesRes.data || [];
      const expenses = expensesRes.data || [];
      const todaySales = todaySalesRes.data || [];
      const weeklySales = weeklySalesRes.data || [];
      const products = lowStockRes.data || [];
      const profitProducts = profitRes.data || [];

      const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const todaySalesTotal = todaySales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const todayProfit = todaySales.reduce((sum, s) => sum + Number(s.sale_profit || 0), 0);
      const weeklyProfit = weeklySales.reduce((sum, s) => sum + Number(s.sale_profit || 0), 0);

      const methodMap: Record<string, number> = {};
      sales.forEach(s => {
        methodMap[s.payment_method] = (methodMap[s.payment_method] || 0) + Number(s.total_amount);
      });
      const salesByMethod = Object.entries(methodMap).map(([method, total]) => ({ method, total }));
      const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold);

      // Aggregate profit by product name
      const profitMap: Record<string, number> = {};
      profitProducts.forEach((s: any) => {
        const name = s.products?.name || 'Unknown';
        profitMap[name] = (profitMap[name] || 0) + Number(s.sale_profit || 0);
      });
      const topProfitableProducts = Object.entries(profitMap)
        .map(([name, profit]) => ({ name, profit }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);

      setReferralCode(profileRes.data?.referral_code || '');
      setReferralCount(referralsRes.data?.length || 0);
      setIsPremium(profileRes.data?.plan === 'premium');
      setSubscription(subRes.data?.[0] || null);

      setData({ totalSales, totalExpenses, todaySales: todaySalesTotal, todaySalesCount: todaySales.length, todayProfit, weeklyProfit, lowStockProducts, salesByMethod, topProfitableProducts });
      setLoading(false);
    };
    fetchData();
  }, [user, currentBranch, allBranchesMode]);

  const profit = data.totalSales - data.totalExpenses;

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: 'Referral code copied!' });
  };

  const shareReferralWhatsApp = () => {
    const text = `Join SmartBiz and get 7 FREE Premium days! Use my referral code: ${referralCode}\n\nSign up here: ${window.location.origin}/auth?ref=${referralCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const statCards = [
    { title: 'Total Sales', value: data.totalSales, icon: ShoppingCart, color: 'text-primary' },
    { title: 'Total Expenses', value: data.totalExpenses, icon: TrendingDown, color: 'text-destructive' },
    { title: 'Net Profit', value: profit, icon: profit >= 0 ? TrendingUp : TrendingDown, color: profit >= 0 ? 'text-success' : 'text-destructive' },
    { title: "Today's Sales", value: data.todaySales, icon: Banknote, color: 'text-info', subtitle: `${data.todaySalesCount} transactions` },
    { title: "Today's Profit", value: data.todayProfit, icon: TrendingUp, color: 'text-success' },
    { title: "Weekly Profit", value: data.weeklyProfit, icon: TrendingUp, color: 'text-primary' },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
        {!allBranchesMode && currentBranch && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {currentBranch.branch_name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ title, value, icon: Icon, color, subtitle }) => (
          <Card key={title} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">{formatUGX(value)}</div>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Sales by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {data.salesByMethod.length === 0 ? (
              <p className="text-muted-foreground text-sm">No sales recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.salesByMethod.map(({ method, total }) => (
                  <div key={method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">{method}</span>
                    </div>
                    <span className="text-sm font-heading font-semibold">{formatUGX(total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top Profitable Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProfitableProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No profit data yet.</p>
            ) : (
              <div className="space-y-3">
                {data.topProfitableProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <span className="text-sm font-heading font-semibold text-primary">{formatUGX(p.profit)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStockProducts.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Package className="h-4 w-4" />
                All products are well stocked.
              </div>
            ) : (
              <div className="space-y-3">
                {data.lowStockProducts.map((p) => (
                  <div key={p.name} className="flex items-center justify-between bg-destructive/5 rounded-lg p-3">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-sm font-heading font-bold text-destructive">{p.stock_quantity} left</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referral Section */}
      {referralCode && (
        <Card className="glass-card border-accent/30">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Gift className="h-5 w-5 text-accent" />
              Invite & Earn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share your referral code and earn <span className="font-bold text-foreground">7 free Premium days</span> when they subscribe!
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono font-bold text-lg tracking-wider text-center">
                {referralCode}
              </div>
              <Button variant="outline" size="icon" onClick={copyReferralCode}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={shareReferralWhatsApp}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {referralCount} successful referral{referralCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
