import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, Award, AlertTriangle } from 'lucide-react';
import { formatUGX } from '@/lib/currency';

const COLORS = ['hsl(160, 60%, 38%)', 'hsl(38, 92%, 55%)', 'hsl(210, 80%, 55%)', 'hsl(0, 72%, 51%)', 'hsl(280, 60%, 50%)'];

const Reports = () => {
  const { user } = useAuth();
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const [salesRes, expensesRes, allSalesRes] = await Promise.all([
        supabase.from('sales').select('total_amount, sale_date, payment_method, product_id, products(name)').eq('user_id', user.id).gte('sale_date', thirtyDaysAgo),
        supabase.from('expenses').select('amount, expense_date').eq('user_id', user.id).gte('expense_date', thirtyDaysAgo),
        supabase.from('sales').select('total_amount, product_id, products(name), quantity').eq('user_id', user.id),
      ]);

      const sales = salesRes.data || [];
      const expenses = expensesRes.data || [];
      const allSales = allSalesRes.data || [];

      // Daily summary (last 7 days)
      const daily: Record<string, { sales: number; expenses: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
        daily[day] = { sales: 0, expenses: 0 };
      }
      sales.forEach(s => {
        const day = format(new Date(s.sale_date), 'yyyy-MM-dd');
        if (daily[day]) daily[day].sales += Number(s.total_amount);
      });
      expenses.forEach(e => {
        const day = format(new Date(e.expense_date), 'yyyy-MM-dd');
        if (daily[day]) daily[day].expenses += Number(e.amount);
      });
      setDailyData(Object.entries(daily).map(([date, vals]) => ({
        date: format(new Date(date), 'MMM d'), ...vals,
      })));

      // Payment method breakdown
      const methodMap: Record<string, number> = {};
      sales.forEach(s => { methodMap[s.payment_method] = (methodMap[s.payment_method] || 0) + Number(s.total_amount); });
      setPaymentData(Object.entries(methodMap).map(([name, value]) => ({ name, value })));

      // Top products
      const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      allSales.forEach(s => {
        const name = s.products?.name || 'Unknown';
        if (!productMap[s.product_id]) productMap[s.product_id] = { name, qty: 0, revenue: 0 };
        productMap[s.product_id].qty += s.quantity;
        productMap[s.product_id].revenue += Number(s.total_amount);
      });
      const sorted = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      setTopProducts(sorted);

      // AI-style insights
      const totalSales = allSales.reduce((s, r) => s + Number(r.total_amount), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
      const newInsights: string[] = [];
      if (sorted.length > 0) newInsights.push(`🏆 "${sorted[0].name}" is your best seller with UGX ${sorted[0].revenue.toLocaleString()} in revenue.`);
      if (totalSales > totalExpenses) {
        newInsights.push(`📈 Your profit margin is ${((1 - totalExpenses / totalSales) * 100).toFixed(1)}%. Keep it up!`);
      } else if (totalSales > 0) {
        newInsights.push(`⚠️ Your expenses exceed sales. Consider reviewing your spending.`);
      }
      if (sales.length > 0) {
        const avgSale = totalSales / allSales.length;
        newInsights.push(`💰 Average transaction value: UGX ${Math.round(avgSale).toLocaleString()}`);
      }
      setInsights(newInsights);
    };
    fetchReports();
  }, [user]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold">Reports & Insights</h1>

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Business Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.map((insight, i) => (
              <p key={i} className="text-sm">{insight}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales vs Expenses chart */}
        <Card className="glass-card">
          <CardHeader><CardTitle className="font-heading">Sales vs Expenses (7 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="sales" fill="hsl(160, 60%, 38%)" radius={[4, 4, 0, 0]} name="Sales" />
                <Bar dataKey="expenses" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment methods pie */}
        <Card className="glass-card">
          <CardHeader><CardTitle className="font-heading">Payment Methods</CardTitle></CardHeader>
          <CardContent>
            {paymentData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top products */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Award className="h-5 w-5 text-warning" />
            Top Selling Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sales data yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-heading font-bold text-muted-foreground">#{i + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.qty} units sold</p>
                    </div>
                  </div>
                  <span className="font-heading font-bold">{formatUGX(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
