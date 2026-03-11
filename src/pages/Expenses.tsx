import { useEffect, useState } from 'react';
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
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatUGX } from '@/lib/currency';
import { saveOfflineExpense } from '@/lib/offlineDb';

const CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Transport', 'Marketing', 'Salaries', 'Other'];

const Expenses = () => {
  const { user } = useAuth();
  const { currentBranch, allBranchesMode } = useBranch();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '', category: 'Other', expense_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });

  const fetchExpenses = async () => {
    if (!user) return;
    let query = supabase.from('expenses').select('*').eq('user_id', user.id).order('expense_date', { ascending: false });
    if (!allBranchesMode && currentBranch) query = query.eq('branch_id', currentBranch.id);
    const { data } = await query;
    setExpenses(data || []);
  };

  useEffect(() => { fetchExpenses(); }, [user, currentBranch, allBranchesMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const expenseData: any = {
      user_id: user.id,
      name: form.name,
      amount: parseFloat(form.amount) || 0,
      category: form.category,
      expense_date: form.expense_date,
      notes: form.notes || null,
      branch_id: (!allBranchesMode && currentBranch) ? currentBranch.id : null,
    };

    if (!navigator.onLine) {
      await saveOfflineExpense(expenseData);
      toast({ title: 'Expense saved offline', description: 'Will sync when you\'re back online.' });
    } else {
      const { error } = await supabase.from('expenses').insert(expenseData);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Expense added!' });
    }

    setForm({ name: '', amount: '', category: 'Other', expense_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    setOpen(false);
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    fetchExpenses();
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Expenses</h1>
          <p className="text-muted-foreground text-sm">Total: <span className="font-heading font-bold text-foreground">{formatUGX(totalExpenses)}</span></p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Add Expense</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Button type="submit" className="w-full">Add Expense</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-heading">Expense History</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No expenses yet</TableCell></TableRow>
                ) : expenses.map(exp => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-sm">{format(new Date(exp.expense_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">{exp.name}</TableCell>
                    <TableCell><span className="text-xs bg-secondary px-2 py-1 rounded-full">{exp.category}</span></TableCell>
                    <TableCell className="font-heading font-semibold">{formatUGX(Number(exp.amount))}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(exp.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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

export default Expenses;
