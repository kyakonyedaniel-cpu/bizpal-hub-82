import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Users, Shield } from 'lucide-react';

const ROLES = ['owner', 'manager', 'cashier'] as const;

const roleColors: Record<string, string> = {
  owner: 'default',
  manager: 'secondary',
  cashier: 'outline',
};

const rolePermissions: Record<string, string[]> = {
  owner: ['Full system access'],
  manager: ['Manage products & inventory', 'View reports', 'Record sales'],
  cashier: ['Record sales only', 'View product list'],
};

const StaffManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'cashier' });

  const fetchStaff = async () => {
    if (!user) return;
    const { data } = await supabase.from('staff').select('*').eq('user_id', user.id).order('created_at');
    setStaff(data || []);
  };

  useEffect(() => { fetchStaff(); }, [user]);

  const resetForm = () => { setForm({ name: '', email: '', role: 'cashier' }); setEditing(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      user_id: user.id,
      business_id: user.id,
      name: form.name,
      email: form.email,
      role: form.role,
    };

    const { error } = editing
      ? await supabase.from('staff').update(payload).eq('id', editing.id)
      : await supabase.from('staff').insert(payload);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editing ? 'Staff updated!' : 'Staff added!' });
      resetForm();
      setOpen(false);
      fetchStaff();
    }
  };

  const handleEdit = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, email: s.email, role: s.role });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('staff').delete().eq('id', id);
    toast({ title: 'Staff removed' });
    fetchStaff();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Staff Management
        </h1>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">{editing ? 'Edit' : 'Add'} Staff Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Show permissions for selected role */}
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Permissions for {form.role}:
                </p>
                {rolePermissions[form.role]?.map(p => (
                  <p key={p} className="text-xs text-muted-foreground">• {p}</p>
                ))}
              </div>
              <Button type="submit" className="w-full">{editing ? 'Update' : 'Add'} Staff</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map(role => (
          <Card key={role} className="glass-card">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={roleColors[role] as any} className="capitalize">{role}</Badge>
                <span className="text-sm text-muted-foreground">{staff.filter(s => s.role === role).length} members</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {rolePermissions[role].map(p => <li key={p}>• {p}</li>)}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-heading">Staff Members</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No staff members yet</TableCell></TableRow>
                ) : staff.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleColors[s.role] as any} className="capitalize">{s.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default StaffManagement;
