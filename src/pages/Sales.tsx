import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Printer, Share2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { formatUGX } from '@/lib/currency';
import { saveOfflineSale } from '@/lib/offlineDb';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import UpgradeModal from '@/components/UpgradeModal';

const PAYMENT_METHODS = ['Cash', 'MTN MoMo', 'Airtel Money', 'Bank'];

const Sales = () => {
  const { user } = useAuth();
  const { currentBranch, allBranchesMode } = useBranch();
  const { toast } = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    product_id: '', quantity: '1', payment_method: 'Cash', customer_id: '', notes: '',
  });

  const fetchData = async () => {
    if (!user) return;
    let salesQ = supabase.from('sales').select('*, products(name, cost_price, price), customers(name)').eq('user_id', user.id).order('sale_date', { ascending: false });
    let productsQ = supabase.from('products').select('*').eq('user_id', user.id).gt('stock_quantity', 0);
    let customersQ = supabase.from('customers').select('*').eq('user_id', user.id);

    if (!allBranchesMode && currentBranch) {
      salesQ = salesQ.eq('branch_id', currentBranch.id);
      productsQ = productsQ.eq('branch_id', currentBranch.id);
    }

    const [s, p, c] = await Promise.all([salesQ, productsQ, customersQ]);
    setSales(s.data || []);
    setProducts(p.data || []);
    setCustomers(c.data || []);
  };

  useEffect(() => { fetchData(); }, [user, currentBranch, allBranchesMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.product_id) return;

    const product = products.find(p => p.id === form.product_id);
    if (!product) return;

    const qty = parseInt(form.quantity) || 1;
    if (qty > product.stock_quantity) {
      toast({ title: 'Insufficient stock', description: `Only ${product.stock_quantity} available.`, variant: 'destructive' });
      return;
    }

    const total = product.price * qty;
    const profitPerItem = Number(product.price) - Number(product.cost_price || 0);
    const saleProfit = profitPerItem * qty;

    const saleData: any = {
      user_id: user.id,
      product_id: form.product_id,
      quantity: qty,
      unit_price: product.price,
      total_amount: total,
      sale_profit: saleProfit,
      payment_method: form.payment_method,
      customer_id: form.customer_id || null,
      notes: form.notes || null,
      branch_id: (!allBranchesMode && currentBranch) ? currentBranch.id : null,
    };

    if (!navigator.onLine) {
      await saveOfflineSale(saleData);
      toast({ title: 'Sale saved offline', description: 'Will sync when you\'re back online.' });
    } else {
      const { error } = await supabase.from('sales').insert(saleData);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Sale recorded!' });
    }

    setForm({ product_id: '', quantity: '1', payment_method: 'Cash', customer_id: '', notes: '' });
    setOpen(false);
    fetchData();
  };

  const selectedProduct = products.find(p => p.id === form.product_id);
  const calculatedTotal = selectedProduct ? selectedProduct.price * (parseInt(form.quantity) || 1) : 0;

  const generateReceiptText = (sale: any) => {
    return `🧾 *SmartBiz Receipt*\n📅 ${format(new Date(sale.sale_date), 'PPp')}\n\n📦 Product: ${sale.products?.name || 'N/A'}\n🔢 Qty: ${sale.quantity}\n💰 Unit Price: ${formatUGX(Number(sale.unit_price))}\n\n✅ *Total: ${formatUGX(Number(sale.total_amount))}*\n💳 Payment: ${sale.payment_method}\n${sale.customers?.name ? `👤 Customer: ${sale.customers.name}` : ''}\n\nThank you for your business! 🙏`;
  };

  const shareWhatsApp = (sale: any) => {
    const text = generateReceiptText(sale);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const printReceipt = (sale: any) => {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><title>Receipt</title>
      <style>body{font-family:monospace;padding:20px;max-width:350px;margin:0 auto}
      h2{text-align:center;margin-bottom:4px}hr{border:1px dashed #ccc}
      .row{display:flex;justify-content:space-between;margin:4px 0}
      .total{font-size:1.2em;font-weight:bold}</style></head>
      <body>
        <h2>SmartBiz Receipt</h2>
        <p style="text-align:center">${format(new Date(sale.sale_date), 'PPp')}</p>
        <hr/>
        <div class="row"><span>Product:</span><span>${sale.products?.name || 'N/A'}</span></div>
        <div class="row"><span>Qty:</span><span>${sale.quantity}</span></div>
        <div class="row"><span>Unit Price:</span><span>${formatUGX(Number(sale.unit_price))}</span></div>
        <hr/>
        <div class="row total"><span>Total:</span><span>${formatUGX(Number(sale.total_amount))}</span></div>
        <div class="row"><span>Payment:</span><span>${sale.payment_method}</span></div>
        ${sale.customers?.name ? `<div class="row"><span>Customer:</span><span>${sale.customers.name}</span></div>` : ''}
        <hr/><p style="text-align:center;font-size:12px">Thank you for your business!</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Sales</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Record Sale</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Record a Sale</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Product *</Label>
                <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({formatUGX(Number(p.price))}) — {p.stock_quantity} in stock
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Customer (optional)</Label>
                <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedProduct && (
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-heading font-bold text-lg">{formatUGX(calculatedTotal)}</span>
                </div>
              )}
              <Button type="submit" className="w-full">Record Sale</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-heading">Sales History</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No sales yet</TableCell></TableRow>
                ) : sales.map(sale => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-sm">{format(new Date(sale.sale_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">{sale.products?.name}</TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell className="font-heading font-semibold">{formatUGX(Number(sale.total_amount))}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-secondary px-2 py-1 rounded-full">{sale.payment_method}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sale.customers?.name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => printReceipt(sale)} title="Print">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => shareWhatsApp(sale)} title="Share via WhatsApp">
                          <Share2 className="h-4 w-4 text-green-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sales;
