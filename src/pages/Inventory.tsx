import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, AlertTriangle, ImagePlus, Package, ScanBarcode } from 'lucide-react';
import { formatUGX } from '@/lib/currency';
import BarcodeScanner from '@/components/BarcodeScanner';

const Inventory = () => {
  const { user } = useAuth();
  const { currentBranch, allBranchesMode, branches } = useBranch();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '', price: '', cost_price: '', stock_quantity: '', low_stock_threshold: '5', category: '', description: '', branch_id: '', barcode: '',
  });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const planLimits = usePlanLimits();

  const fetchProducts = async () => {
    if (!user) return;
    let query = supabase.from('products').select('*').eq('user_id', user.id).order('name');
    if (!allBranchesMode && currentBranch) query = query.eq('branch_id', currentBranch.id);
    const { data } = await query;
    setProducts(data || []);
  };

  useEffect(() => { fetchProducts(); }, [user, currentBranch, allBranchesMode]);

  const resetForm = () => {
    setForm({ name: '', price: '', cost_price: '', stock_quantity: '', low_stock_threshold: '5', category: '', description: '', branch_id: '', barcode: '' });
    setEditing(null);
    setImageFile(null);
  };

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile || !user) return null;
    const ext = imageFile.name.split('.').pop();
    const path = `${user.id}/${productId}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, imageFile, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUploading(true);

    const payload: any = {
      name: form.name,
      price: parseFloat(form.price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      category: form.category || null,
      description: form.description || null,
      barcode: form.barcode || null,
      user_id: user.id,
      branch_id: form.branch_id || ((!allBranchesMode && currentBranch) ? currentBranch.id : null),
    };

    if (editing) {
      if (imageFile) {
        const url = await uploadImage(editing.id);
        if (url) payload.image_url = url;
      }
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      setUploading(false);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Product updated!' });
        resetForm(); setOpen(false); fetchProducts();
      }
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select().single();
      if (error) {
        setUploading(false);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      if (imageFile && data) {
        const url = await uploadImage(data.id);
        if (url) await supabase.from('products').update({ image_url: url }).eq('id', data.id);
      }
      setUploading(false);
      toast({ title: 'Product added!' });
      resetForm(); setOpen(false); fetchProducts();
    }
  };

  const handleEdit = (product: any) => {
    setEditing(product);
    setForm({
      name: product.name,
      price: String(product.price),
      cost_price: String(product.cost_price || ''),
      stock_quantity: String(product.stock_quantity),
      low_stock_threshold: String(product.low_stock_threshold),
      category: product.category || '',
      description: product.description || '',
      branch_id: product.branch_id || '',
      barcode: product.barcode || '',
    });
    setImageFile(null);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    // Check if product has linked sales
    const { count } = await supabase.from('sales').select('id', { count: 'exact', head: true }).eq('product_id', id);
    
    const hasLinkedSales = count && count > 0;
    const message = hasLinkedSales
      ? `This product has ${count} sale(s) linked to it. Deleting will also remove those sales records. Continue?`
      : 'Are you sure you want to delete this product?';
    
    if (!confirm(message)) return;

    // Delete linked sales first if any
    if (hasLinkedSales) {
      const { error: salesError } = await supabase.from('sales').delete().eq('product_id', id);
      if (salesError) {
        toast({ title: 'Error removing linked sales', description: salesError.message, variant: 'destructive' });
        return;
      }
    }
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Product deleted', description: hasLinkedSales ? `Also removed ${count} linked sale(s).` : undefined });
      fetchProducts();
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    setForm(prev => ({ ...prev, barcode }));
    toast({ title: 'Barcode scanned', description: barcode });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        feature="Free plan allows only 20 products. Upgrade to Premium for unlimited products."
        currentUsage={String(planLimits.productCount)}
        limit={String(planLimits.maxProducts)}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Inventory</h1>
          {!planLimits.isPremium && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Lock className="h-3 w-3" /> Products: {planLimits.productCount}/{planLimits.maxProducts}
            </p>
          )}
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={(e) => {
              if (!planLimits.canAddProduct && !editing) {
                e.preventDefault();
                setUpgradeOpen(true);
              }
            }}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Barcode</Label>
                <div className="flex gap-2">
                  <Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or enter barcode" className="flex-1" />
                  <Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)}>
                    <ScanBarcode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div
                  className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imageFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <ImagePlus className="h-4 w-4 text-primary" />
                      <span className="text-sm">{imageFile.name}</span>
                    </div>
                  ) : editing?.image_url ? (
                    <img src={editing.image_url} alt="" className="h-16 w-16 object-cover rounded mx-auto" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-xs">Click to upload image</span>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Selling Price *</Label>
                  <Input type="number" step="1" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Cost Price</Label>
                  <Input type="number" step="1" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock Quantity</Label>
                  <Input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Alert</Label>
                  <Input type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g., Electronics" />
              </div>
              {branches.length > 0 && (
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}>
                    <option value="">No branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                  </select>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? 'Saving...' : editing ? 'Update' : 'Add'} Product
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-heading">Products</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No products yet</TableCell></TableRow>
                ) : products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{(p as any).barcode || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category || '—'}</TableCell>
                    <TableCell className="font-heading">{formatUGX(Number(p.price))}</TableCell>
                    <TableCell className="text-sm">{formatUGX(Number(p.cost_price || 0))}</TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1 font-medium ${p.stock_quantity <= p.low_stock_threshold ? 'text-destructive' : ''}`}>
                        {p.stock_quantity <= p.low_stock_threshold && <AlertTriangle className="h-3 w-3" />}
                        {p.stock_quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeScan}
      />
    </div>
  );
};

export default Inventory;
