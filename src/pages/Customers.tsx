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
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { formatUGX } from '@/lib/currency';

const Customers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewCustomer, setViewCustomer] = useState<any>(null);
  const [customerSales, setCustomerSales] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });

  const fetchCustomers = async () => {
    if (!user) return;
    const { data } = await supabase.from('customers').select('*').eq('user_id', user.id).order('name');
    setCustomers(data || []);
  };

  useEffect(() => { fetchCustomers(); }, [user]);

  const resetForm = () => { setForm({ name: '', phone: '', email: '', notes: '' }); setEditing(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = { ...form, user_id: user.id, email: form.email || null, notes: form.notes || null };
    const { error } = editing
      ? await supabase.from('customers').update(payload).eq('id', editing.id)
      : await supabase.from('customers').insert(payload);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editing ? 'Customer updated!' : 'Customer added!' });
      resetForm(); setOpen(false); fetchCustomers();
    }
  };

  const handleEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', notes: c.notes || '' });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('customers').delete().eq('id', id);
    fetchCustomers();
  };

  const viewHistory = async (customer: any) => {
    setViewCustomer(customer);
    const { data } = await supabase.from('sales').select('*, products(name)').eq('customer_id', customer.id).order('sale_date', { ascending: false });
    setCustomerSales(data || []);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Customers</h1>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">{editing ? 'Edit' : 'Add'} Customer</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">{editing ? 'Update' : 'Add'} Customer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Customer purchase history dialog */}
      <Dialog open={!!viewCustomer} onOpenChange={v => { if (!v) setViewCustomer(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">{viewCustomer?.name}'s Purchases</DialogTitle></DialogHeader>
          {customerSales.length === 0 ? (
            <p className="text-muted-foreground text-sm">No purchases yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {customerSales.map(s => (
                <div key={s.id} className="flex justify-between items-center bg-muted rounded-lg p-3">
                  <div>
                    <p className="font-medium text-sm">{s.products?.name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(s.sale_date), 'MMM d, yyyy')}</p>
                  </div>
                  <span className="font-heading font-bold">{formatUGX(Number(s.total_amount))}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-heading">Customer List</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No customers yet</TableCell></TableRow>
                ) : customers.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.phone || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => viewHistory(c)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default Customers;
