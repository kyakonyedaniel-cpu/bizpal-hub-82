import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, ShoppingCart, AlertTriangle, Package, Banknote } from 'lucide-react';
import { formatUGX } from '@/lib/currency';
import { format } from 'date-fns';

interface DashboardData {
  totalSales: number;
  totalExpenses: number;
  todaySales: number;
  todaySalesCount: number;
  lowStockProducts: { name: string; stock_quantity: number }[];
  salesByMethod: { method: string; total: number }[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalSales: 0, totalExpenses: 0, todaySales: 0, todaySalesCount: 0,
    lowStockProducts: [], salesByMethod: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [salesRes, expensesRes, todaySalesRes, lowStockRes] = await Promise.all([
        supabase.from('sales').select('total_amount, payment_method').eq('user_id', user.id),
        supabase.from('expenses').select('amount').eq('user_id', user.id),
        supabase.from('sales').select('total_amount').eq('user_id', user.id).gte('sale_date', today),
        supabase.from('products').select('name, stock_quantity, low_stock_threshold').eq('user_id', user.id),
      ]);

      const sales = salesRes.data || [];
      const expenses = expensesRes.data || [];
      const todaySales = todaySalesRes.data || [];
      const products = lowStockRes.data || [];

      const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const todaySalesTotal = todaySales.reduce((sum, s) => sum + Number(s.total_amount), 0);

      const methodMap: Record<string, number> = {};
      sales.forEach(s => {
        methodMap[s.payment_method] = (methodMap[s.payment_method] || 0) + Number(s.total_amount);
      });
      const salesByMethod = Object.entries(methodMap).map(([method, total]) => ({ method, total }));

      const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold);

      setData({
        totalSales, totalExpenses, todaySales: todaySalesTotal,
        todaySalesCount: todaySales.length, lowStockProducts, salesByMethod,
      });
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const profit = data.totalSales - data.totalExpenses;

  const statCards = [
    { title: 'Total Sales', value: data.totalSales, icon: ShoppingCart, color: 'text-primary' },
    { title: 'Total Expenses', value: data.totalExpenses, icon: TrendingDown, color: 'text-destructive' },
    { title: 'Net Profit', value: profit, icon: profit >= 0 ? TrendingUp : TrendingDown, color: profit >= 0 ? 'text-success' : 'text-destructive' },
    { title: "Today's Sales", value: data.todaySales, icon: Banknote, color: 'text-info', subtitle: `${data.todaySalesCount} transactions` },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ title, value, icon: Icon, color, subtitle }) => (
          <Card key={title} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">
                {formatUGX(value)}
              </div>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by payment method */}
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
                    <span className="text-sm font-heading font-semibold">
                      {total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock alerts */}
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
                    <span className="text-sm font-heading font-bold text-destructive">
                      {p.stock_quantity} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
