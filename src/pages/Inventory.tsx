import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { formatUGX } from '@/lib/currency';

const Inventory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', price: '', cost_price: '', stock_quantity: '', low_stock_threshold: '5', category: '', description: '',
  });

  const fetchProducts = async () => {
    if (!user) return;
    const { data } = await supabase.from('products').select('*').eq('user_id', user.id).order('name');
    setProducts(data || []);
  };

  useEffect(() => { fetchProducts(); }, [user]);

  const resetForm = () => {
    setForm({ name: '', price: '', cost_price: '', stock_quantity: '', low_stock_threshold: '5', category: '', description: '' });
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      name: form.name,
      price: parseFloat(form.price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      category: form.category || null,
      description: form.description || null,
      user_id: user.id,
    };

    const { error } = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editing ? 'Product updated!' : 'Product added!' });
      resetForm();
      setOpen(false);
      fetchProducts();
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
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Product deleted' });
      fetchProducts();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Inventory</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Product</Button>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Selling Price *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Cost Price</Label>
                  <Input type="number" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} />
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
              <Button type="submit" className="w-full">{editing ? 'Update' : 'Add'} Product</Button>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No products yet</TableCell></TableRow>
                ) : products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category || '—'}</TableCell>
                    <TableCell className="font-heading">${Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="text-sm">${Number(p.cost_price || 0).toFixed(2)}</TableCell>
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
    </div>
  );
};

export default Inventory;
