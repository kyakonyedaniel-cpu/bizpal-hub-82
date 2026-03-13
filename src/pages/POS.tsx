import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Minus, Trash2, Receipt, Package, Share2, ScanBarcode } from 'lucide-react';
import { formatUGX } from '@/lib/currency';
import { format } from 'date-fns';
import { saveOfflineSale } from '@/lib/offlineDb';
import BarcodeScanner from '@/components/BarcodeScanner';

const PAYMENT_METHODS = ['Cash', 'MTN MoMo', 'Airtel Money', 'Bank'];

interface CartItem {
  product: any;
  quantity: number;
}

const POS = () => {
  const { user } = useAuth();
  const { currentBranch, allBranchesMode } = useBranch();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerId, setCustomerId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [lastSaleReceipt, setLastSaleReceipt] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [newProductForm, setNewProductForm] = useState({ name: '', price: '', cost_price: '', stock_quantity: '' });

  const fetchData = async () => {
    if (!user) return;
    let pQuery = supabase.from('products').select('*').eq('user_id', user.id).gt('stock_quantity', 0).order('name');
    if (!allBranchesMode && currentBranch) pQuery = pQuery.eq('branch_id', currentBranch.id);
    const [p, c] = await Promise.all([
      pQuery,
      supabase.from('customers').select('*').eq('user_id', user.id),
    ]);
    setProducts(p.data || []);
    setCustomers(c.data || []);
  };

  useEffect(() => { fetchData(); }, [user, currentBranch, allBranchesMode]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast({ title: 'Max stock reached', variant: 'destructive' });
          return prev;
        }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0 || newQty > i.product.stock_quantity) return i;
      return { ...i, quantity: newQty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const handleBarcodeDetected = async (barcode: string) => {
    // Search for product by barcode
    const found = products.find(p => (p as any).barcode === barcode);
    if (found) {
      addToCart(found);
      toast({ title: `Added: ${found.name}` });
    } else {
      // Also search in DB for products not in current view (out of stock etc.)
      const { data } = await (supabase
        .from('products')
        .select('*')
        .eq('user_id', user!.id) as any)
        .eq('barcode', barcode)
        .single();
      
      if (data && (data as any).stock_quantity > 0) {
        addToCart(data);
        toast({ title: `Added: ${(data as any).name}` });
      } else if (data) {
        toast({ title: 'Product out of stock', description: (data as any).name, variant: 'destructive' });
      } else {
        setScannedBarcode(barcode);
        setNewProductOpen(true);
        toast({ title: 'Barcode not found', description: 'Create a new product for this barcode.' });
      }
    }
  };

  const handleCreateProduct = async () => {
    if (!user || !newProductForm.name) return;
    const payload = {
      name: newProductForm.name,
      price: parseFloat(newProductForm.price) || 0,
      cost_price: parseFloat(newProductForm.cost_price) || 0,
      stock_quantity: parseInt(newProductForm.stock_quantity) || 0,
      barcode: scannedBarcode,
      user_id: user.id,
      branch_id: (!allBranchesMode && currentBranch) ? currentBranch.id : null,
    } as any;

    const { data, error } = await supabase.from('products').insert(payload).select().single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Product created!' });
    setNewProductOpen(false);
    setNewProductForm({ name: '', price: '', cost_price: '', stock_quantity: '' });
    setScannedBarcode('');
    fetchData();
    if (data && (data as any).stock_quantity > 0) addToCart(data);
  };

  const checkout = async () => {
    if (!user || cart.length === 0) return;
    setProcessing(true);

    const inserts = cart.map(i => {
      const profitPerItem = Number(i.product.price) - Number(i.product.cost_price || 0);
      return {
        user_id: user.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price,
        total_amount: i.product.price * i.quantity,
        sale_profit: profitPerItem * i.quantity,
        payment_method: paymentMethod,
        customer_id: customerId || null,
        branch_id: (!allBranchesMode && currentBranch) ? currentBranch.id : null,
      };
    });

    if (!navigator.onLine) {
      for (const sale of inserts) await saveOfflineSale(sale);
      toast({ title: 'Sales saved offline', description: 'Will sync when back online.' });
    } else {
      const { error } = await supabase.from('sales').insert(inserts);
      if (error) {
        setProcessing(false);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
    }

    const itemsList = cart.map(i => `📦 ${i.product.name} x${i.quantity} — ${formatUGX(i.product.price * i.quantity)}`).join('\n');
    const receiptText = `🧾 *SmartBiz Receipt*\n📅 ${format(new Date(), 'PPp')}\n\n${itemsList}\n\n✅ *Total: ${formatUGX(cartTotal)}*\n💳 Payment: ${paymentMethod}\n\nThank you for your business! 🙏`;
    setLastSaleReceipt(receiptText);

    const w = window.open('', '_blank', 'width=400,height=600');
    if (w) {
      const itemsHtml = cart.map(i =>
        `<div class="row"><span>${i.product.name} x${i.quantity}</span><span>UGX ${(i.product.price * i.quantity).toLocaleString()}</span></div>`
      ).join('');
      w.document.write(`
        <html><head><title>Receipt</title>
        <style>body{font-family:monospace;padding:20px;max-width:350px;margin:0 auto}
        h2{text-align:center;margin-bottom:4px}hr{border:1px dashed #ccc}
        .row{display:flex;justify-content:space-between;margin:4px 0}
        .total{font-size:1.2em;font-weight:bold}</style></head>
        <body>
          <h2>SmartBiz Receipt</h2>
          <p style="text-align:center">${format(new Date(), 'PPp')}</p>
          <hr/>${itemsHtml}<hr/>
          <div class="row total"><span>Total:</span><span>UGX ${cartTotal.toLocaleString()}</span></div>
          <div class="row"><span>Payment:</span><span>${paymentMethod}</span></div>
          <hr/><p style="text-align:center;font-size:12px">Thank you for your business!</p>
        </body></html>
      `);
      w.document.close();
      w.print();
    }

    setProcessing(false);
    toast({ title: `Sale of ${formatUGX(cartTotal)} completed!` });
    setCart([]);
    fetchData();
  };

  const shareLastReceipt = () => {
    if (lastSaleReceipt) {
      window.open(`https://wa.me/?text=${encodeURIComponent(lastSaleReceipt)}`, '_blank');
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
    ((p as any).barcode || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" /> POS Mode
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setScannerOpen(true)}>
            <ScanBarcode className="h-4 w-4 mr-2" /> Scan Barcode
          </Button>
          {lastSaleReceipt && (
            <Button variant="outline" size="sm" onClick={shareLastReceipt}>
              <Share2 className="h-4 w-4 mr-2 text-green-600" /> Share Last Receipt
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <input
            type="text"
            placeholder="Search products or barcodes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="glass-card rounded-xl p-3 text-left hover:border-primary/50 transition-all hover:shadow-md active:scale-95"
              >
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-16 w-full object-cover rounded-lg mb-2" />
                ) : (
                  <div className="h-16 w-full bg-muted rounded-lg mb-2 flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xs text-primary font-heading font-bold">{formatUGX(Number(p.price))}</p>
                <p className="text-xs text-muted-foreground">{p.stock_quantity} in stock</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground text-sm py-8">No products found</p>
            )}
          </div>
        </div>

        <Card className="glass-card h-fit sticky top-20">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Cart ({cart.length})
            </h2>

            {cart.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Tap products to add</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cart.map(i => (
                  <div key={i.product.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{i.product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatUGX(i.product.price * i.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(i.product.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-bold w-6 text-center">{i.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(i.product.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromCart(i.product.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-heading font-bold">{formatUGX(cartTotal)}</span>
              </div>

              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Button
                className="w-full text-base h-12"
                disabled={cart.length === 0 || processing}
                onClick={checkout}
              >
                {processing ? 'Processing...' : `Checkout ${formatUGX(cartTotal)}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />

      {/* New Product Dialog for unknown barcodes */}
      <Dialog open={newProductOpen} onOpenChange={setNewProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">New Product (Barcode: {scannedBarcode})</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input value={newProductForm.name} onChange={e => setNewProductForm({ ...newProductForm, name: e.target.value })} placeholder="Product name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Selling Price</Label>
                <Input type="number" value={newProductForm.price} onChange={e => setNewProductForm({ ...newProductForm, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cost Price</Label>
                <Input type="number" value={newProductForm.cost_price} onChange={e => setNewProductForm({ ...newProductForm, cost_price: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Stock Quantity</Label>
              <Input type="number" value={newProductForm.stock_quantity} onChange={e => setNewProductForm({ ...newProductForm, stock_quantity: e.target.value })} />
            </div>
            <Button className="w-full" onClick={handleCreateProduct} disabled={!newProductForm.name}>
              Create Product & Add to Cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;
