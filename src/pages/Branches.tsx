import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Building2, MapPin, Lock } from 'lucide-react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import UpgradeModal from '@/components/UpgradeModal';

const Branches = () => {
  const { user } = useAuth();
  const { refreshBranches } = useBranch();
  const { toast } = useToast();
  const [branches, setBranches] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ branch_name: '', location: '' });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const planLimits = usePlanLimits();

  const fetchBranches = async () => {
    if (!user) return;
    const { data } = await supabase.from('branches').select('*').eq('user_id', user.id).order('branch_name');
    setBranches(data || []);
  };

  useEffect(() => { fetchBranches(); }, [user]);

  const resetForm = () => { setForm({ branch_name: '', location: '' }); setEditing(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = { user_id: user.id, branch_name: form.branch_name, location: form.location || null };

    const { error } = editing
      ? await supabase.from('branches').update(payload).eq('id', editing.id)
      : await supabase.from('branches').insert(payload);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editing ? 'Branch updated!' : 'Branch added!' });
      resetForm();
      setOpen(false);
      fetchBranches();
      refreshBranches();
    }
  };

  const handleEdit = (b: any) => {
    setEditing(b);
    setForm({ branch_name: b.branch_name, location: b.location || '' });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('branches').delete().eq('id', id);
    toast({ title: 'Branch deleted' });
    fetchBranches();
    refreshBranches();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        feature="Free plan allows only 1 branch. Upgrade to Premium for unlimited branches."
        currentUsage={String(planLimits.branchCount)}
        limit={String(planLimits.maxBranches)}
      />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" /> Branches
        </h1>
        {!planLimits.isPremium && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" /> Branches: {planLimits.branchCount}/{planLimits.maxBranches}
          </p>
        )}
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={(e) => {
              if (!planLimits.canAddBranch && !editing) {
                e.preventDefault();
                setUpgradeOpen(true);
              }
            }}><Plus className="h-4 w-4 mr-2" /> Add Branch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">{editing ? 'Edit' : 'Add'} Branch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Branch Name *</Label>
                <Input value={form.branch_name} onChange={e => setForm({ ...form, branch_name: e.target.value })} placeholder="e.g., Main Store" required />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g., Kampala, Uganda" />
              </div>
              <Button type="submit" className="w-full">{editing ? 'Update' : 'Add'} Branch</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-heading">Your Branches</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No branches yet. Add your first branch!</TableCell></TableRow>
                ) : branches.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" /> {b.branch_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.location ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {b.location}</span> : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(b)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default Branches;
