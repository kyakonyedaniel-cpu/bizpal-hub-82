import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { TrendingUp, Award, Download } from 'lucide-react';
import { formatUGX } from '@/lib/currency';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['hsl(160, 60%, 38%)', 'hsl(38, 92%, 55%)', 'hsl(210, 80%, 55%)', 'hsl(0, 72%, 51%)', 'hsl(280, 60%, 50%)'];

const Reports = () => {
  const { user } = useAuth();
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [totals, setTotals] = useState({ sales: 0, expenses: 0 });
  const [businessName, setBusinessName] = useState('SmartBiz');

  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const [salesRes, expensesRes, allSalesRes, profileRes] = await Promise.all([
        supabase.from('sales').select('total_amount, sale_date, payment_method, product_id, products(name)').eq('user_id', user.id).gte('sale_date', thirtyDaysAgo),
        supabase.from('expenses').select('amount, expense_date').eq('user_id', user.id).gte('expense_date', thirtyDaysAgo),
        supabase.from('sales').select('total_amount, product_id, products(name), quantity').eq('user_id', user.id),
        supabase.from('profiles').select('business_name').eq('user_id', user.id).single(),
      ]);

      if (profileRes.data?.business_name) setBusinessName(profileRes.data.business_name);

      const sales = salesRes.data || [];
      const expenses = expensesRes.data || [];
      const allSales = allSalesRes.data || [];

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

      const methodMap: Record<string, number> = {};
      sales.forEach(s => { methodMap[s.payment_method] = (methodMap[s.payment_method] || 0) + Number(s.total_amount); });
      setPaymentData(Object.entries(methodMap).map(([name, value]) => ({ name, value })));

      const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      allSales.forEach(s => {
        const name = s.products?.name || 'Unknown';
        if (!productMap[s.product_id]) productMap[s.product_id] = { name, qty: 0, revenue: 0 };
        productMap[s.product_id].qty += s.quantity;
        productMap[s.product_id].revenue += Number(s.total_amount);
      });
      const sorted = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      setTopProducts(sorted);

      const totalSales = allSales.reduce((s, r) => s + Number(r.total_amount), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
      setTotals({ sales: totalSales, expenses: totalExpenses });

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

  const exportPDF = () => {
    const doc = new jsPDF();
    const today = format(new Date(), 'MMMM d, yyyy');

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(businessName, 14, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Daily Report — ${today}`, 14, 28);
    doc.setDrawColor(40, 167, 69);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    // Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const profit = totals.sales - totals.expenses;
    doc.text(`Total Sales: UGX ${totals.sales.toLocaleString()}`, 14, 50);
    doc.text(`Total Expenses: UGX ${totals.expenses.toLocaleString()}`, 14, 57);
    doc.text(`Net Profit: UGX ${profit.toLocaleString()}`, 14, 64);
    doc.text(`Profit Margin: ${totals.sales > 0 ? ((profit / totals.sales) * 100).toFixed(1) : 0}%`, 14, 71);

    // Top products table
    if (topProducts.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Selling Products', 14, 85);

      (doc as any).autoTable({
        startY: 90,
        head: [['#', 'Product', 'Units Sold', 'Revenue (UGX)']],
        body: topProducts.map((p, i) => [i + 1, p.name, p.qty, p.revenue.toLocaleString()]),
        theme: 'grid',
        headStyles: { fillColor: [40, 167, 69] },
        styles: { fontSize: 10 },
      });
    }

    // Payment methods
    if (paymentData.length > 0) {
      const startY = (doc as any).lastAutoTable?.finalY + 15 || 130;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Methods', 14, startY);

      (doc as any).autoTable({
        startY: startY + 5,
        head: [['Method', 'Amount (UGX)']],
        body: paymentData.map(p => [p.name, p.value.toLocaleString()]),
        theme: 'grid',
        headStyles: { fillColor: [40, 167, 69] },
        styles: { fontSize: 10 },
      });
    }

    // Insights
    if (insights.length > 0) {
      const startY = (doc as any).lastAutoTable?.finalY + 15 || 180;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Business Insights', 14, startY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      insights.forEach((insight, i) => {
        doc.text(insight, 14, startY + 8 + i * 7);
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Generated by SmartBiz Manager', 14, 285);
    doc.text(format(new Date(), 'PPpp'), 196, 285, { align: 'right' });

    doc.save(`${businessName.replace(/\s+/g, '_')}_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Reports & Insights</h1>
        <Button onClick={exportPDF} variant="outline">
          <Download className="h-4 w-4 mr-2" /> Export PDF
        </Button>
      </div>

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
