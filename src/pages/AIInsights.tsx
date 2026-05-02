import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Brain, TrendingUp, Package, DollarSign,
  Users, Lightbulb, AlertTriangle, ArrowRight, RefreshCw,
  HelpCircle, BarChart3
} from 'lucide-react';
import { formatUGX } from '@/lib/currency';
import { format, subDays, startOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface BusinessInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'tip';
  title: string;
  description: string;
  potentialImpact?: string;
}

const AIInsights = () => {
  const { user } = useAuth();
  const { currentBranch, allBranchesMode } = useBranch();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [metrics, setMetrics] = useState({
    growthRate: 0,
    revenueProjection: 0,
    topCategory: '',
    customerRetention: 0,
    inventoryTurnover: 0,
  });

  useEffect(() => {
    if (!user) return;
    generateInsights();
  }, [user, currentBranch, allBranchesMode]);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const lastMonthStart = format(startOfMonth(subDays(new Date(), 30)), 'yyyy-MM-dd');

      let salesQuery = supabase.from('sales').select('total_amount, sale_date, payment_method').eq('user_id', user!.id);
      let productsQuery = supabase.from('products').select('name, stock_quantity, cost_price, selling_price, category').eq('user_id', user!.id);
      let customersQuery = supabase.from('customers').select('id, total_purchases, last_purchase_date').eq('user_id', user!.id);
      let expensesQuery = supabase.from('expenses').select('amount, category').eq('user_id', user!.id);

      if (!allBranchesMode && currentBranch) {
        salesQuery = salesQuery.eq('branch_id', currentBranch.id);
        productsQuery = productsQuery.eq('branch_id', currentBranch.id);
        customersQuery = customersQuery.eq('branch_id', currentBranch.id);
        expensesQuery = expensesQuery.eq('branch_id', currentBranch.id);
      }

      const [salesRes, productsRes, customersRes, expensesRes] = await Promise.all(
        [salesQuery, productsQuery, customersQuery, expensesQuery]
      );

      const sales = salesRes.data || [];
      const products = productsRes.data || [];
      const customers = customersRes.data || [];
      const expenses = expensesRes.data || [];

      const thisMonthSales = sales.filter((s: any) => s.sale_date >= monthStart);
      const lastMonthSales = sales.filter((s: any) => s.sale_date >= lastMonthStart && s.sale_date < monthStart);

      const thisMonthTotal = thisMonthSales.reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);
      const lastMonthTotal = lastMonthSales.reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);

      const growthRate = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
      const revenueProjection = thisMonthTotal * 12;

      const categorySales: Record<string, number> = {};
      sales.forEach((s: any) => {
        const cat = s.payment_method || 'Other';
        categorySales[cat] = (categorySales[cat] || 0) + Number(s.total_amount);
      });
      const topCategory = Object.entries(categorySales).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      const activeCustomers = customers.filter((c: any) => {
        const lastPurchase = c.last_purchase_date ? new Date(c.last_purchase_date) : null;
        return lastPurchase && (new Date().getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24) <= 30;
      });
      const customerRetention = customers.length > 0 ? (activeCustomers.length / customers.length) * 100 : 0;

      const totalStockValue = products.reduce((sum: number, p: any) => sum + (Number(p.stock_quantity) * Number(p.cost_price || 0)), 0);
      const totalSalesValue = sales.reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);
      const inventoryTurnover = totalStockValue > 0 ? totalSalesValue / totalStockValue : 0;

      setMetrics({ growthRate, revenueProjection, topCategory, customerRetention, inventoryTurnover });

      const newInsights: BusinessInsight[] = [];

      if (growthRate > 10) {
        newInsights.push({
          id: '1',
          type: 'opportunity',
          title: 'Strong Growth Detected',
          description: `Your sales grew by ${growthRate.toFixed(1)}% this month. Consider increasing inventory to meet demand.`,
          potentialImpact: `Projected additional revenue: ${formatUGX(thisMonthTotal * 0.1)}`
        });
      } else if (growthRate < 0) {
        newInsights.push({
          id: '2',
          type: 'warning',
          title: 'Sales Decline Alert',
          description: `Sales decreased by ${Math.abs(growthRate).toFixed(1)}% compared to last month. Review pricing and marketing strategies.`,
          potentialImpact: `Potential revenue loss: ${formatUGX(Math.abs(thisMonthTotal - lastMonthTotal))}`
        });
      }

      const lowStockProducts = products.filter((p: any) => p.stock_quantity <= 5);
      if (lowStockProducts.length > 0) {
        newInsights.push({
          id: '3',
          type: 'warning',
          title: 'Low Stock Alert',
          description: `${lowStockProducts.length} products are running low on stock. Restock soon to avoid lost sales.`,
          potentialImpact: `${lowStockProducts.map((p: any) => p.name).slice(0, 3).join(', ')}`
        });
      }

      const slowMovingProducts = products.filter((p: any) => {
        const hasSales = sales.some((s: any) => s.sale_date >= format(subDays(new Date(), 30), 'yyyy-MM-dd'));
        return p.stock_quantity > 20 && !hasSales;
      });
      if (slowMovingProducts.length > 0) {
        newInsights.push({
          id: '4',
          type: 'tip',
          title: 'Slow-Moving Inventory',
          description: `${slowMovingProducts.length} products haven't sold in 30 days. Consider promotions or discounts.`,
          potentialImpact: `Tie-up value: ${formatUGX(slowMovingProducts.reduce((sum: number, p: any) => sum + (p.stock_quantity * Number(p.cost_price || 0)), 0))}`
        });
      }

      if (customerRetention > 70) {
        newInsights.push({
          id: '5',
          type: 'opportunity',
          title: 'Strong Customer Loyalty',
          description: `${customerRetention.toFixed(1)}% of customers made repeat purchases. Launch a loyalty program to boost retention further.`
        });
      }

      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      const totalRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);
      const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

      if (expenseRatio > 40) {
        newInsights.push({
          id: '6',
          type: 'warning',
          title: 'High Expense Ratio',
          description: `Your expenses are ${expenseRatio.toFixed(1)}% of revenue. Look for areas to cut costs.`,
          potentialImpact: `Potential savings: ${formatUGX(totalExpenses * 0.1)}`
        });
      }

      newInsights.push({
        id: '7',
        type: 'tip',
        title: 'Best Selling Category',
        description: `${topCategory} is your top performing payment method. Ensure smooth transactions for this category.`
      });

      setInsights(newInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'tip': return <Lightbulb className="h-5 w-5 text-blue-500" />;
      default: return <Brain className="h-5 w-5" />;
    }
  };

  const getInsightColors = (type: string) => {
    switch (type) {
      case 'opportunity': return 'border-l-green-500 bg-green-500/5';
      case 'warning': return 'border-l-yellow-500 bg-yellow-500/5';
      case 'tip': return 'border-l-blue-500 bg-blue-500/5';
      default: return 'border-l-primary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">AI Insights</h1>
            <p className="text-sm text-muted-foreground">Smart analysis of your business data</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={generateInsights}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Growth Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-heading font-bold ${metrics.growthRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.growthRate >= 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs last month</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Monthly Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-heading font-bold">{formatUGX(metrics.revenueProjection)}</div>
            <p className="text-xs text-muted-foreground mt-1">estimated annual</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-heading font-bold">{metrics.customerRetention.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">last 30 days</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory Turnover
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-heading font-bold">{metrics.inventoryTurnover.toFixed(1)}x</div>
            <p className="text-xs text-muted-foreground mt-1">times per period</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Not enough data to generate insights yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Start recording sales, expenses, and customers to see AI insights.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border-l-4 ${getInsightColors(insight.type)} flex items-start gap-4`}
                >
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    {insight.potentialImpact && (
                      <div className="mt-2 inline-flex items-center gap-2 text-xs bg-background px-2 py-1 rounded">
                        <ArrowRight className="h-3 w-3" />
                        {insight.potentialImpact}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-accent" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-heading font-semibold text-sm">1. Analyze Data</h4>
              <p className="text-xs text-muted-foreground mt-1">AI scans your sales, expenses, inventory & customer data</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-heading font-semibold text-sm">2. Find Patterns</h4>
              <p className="text-xs text-muted-foreground mt-1">Identifies trends, anomalies and opportunities in your business</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-heading font-semibold text-sm">3. Get Insights</h4>
              <p className="text-xs text-muted-foreground mt-1">Receive actionable recommendations to grow your business</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIInsights;