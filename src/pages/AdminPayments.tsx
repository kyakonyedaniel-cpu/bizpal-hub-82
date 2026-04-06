import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatUGX } from '@/lib/currency';
import { ShieldCheck, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const ADMIN_EMAIL = 'kyakonyedaniel@gmail.com';

const AdminPayments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchPayments = async () => {
    setLoading(true);
    // Admin can see all payments via service role edge function
    const { data, error } = await supabase.functions.invoke('admin-payments', {
      body: { action: 'list' },
    });
    if (error) {
      toast({ title: 'Error', description: 'Could not load payments', variant: 'destructive' });
    } else {
      setPayments(data?.payments || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, []);

  const handleAction = async (paymentId: string, userId: string, action: 'approve' | 'reject') => {
    setProcessing(paymentId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-payments', {
        body: { action, payment_id: paymentId, user_id: userId },
      });
      if (error) throw error;
      toast({
        title: action === 'approve' ? '✅ Payment Approved' : '❌ Payment Rejected',
        description: data?.message || `Payment ${action}d successfully.`,
      });
      await fetchPayments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
        <ShieldCheck className="h-6 w-6" /> Admin — Payment Approvals
      </h1>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading">All Payment Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment requests yet.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p: any) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/50 rounded-lg p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{p.phone_number || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.network || 'Unknown'} &middot; {new Date(p.created_at).toLocaleDateString()} &middot; User: {p.user_id?.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-heading font-bold">{formatUGX(Number(p.amount))}</p>
                      <Badge variant={getStatusVariant(p.status)} className="text-xs">{p.status}</Badge>
                    </div>
                    {(p.status === 'pending' || p.status === 'failed') && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAction(p.id, p.user_id, 'approve')}
                          disabled={processing === p.id}
                        >
                          {processing === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1" /> Approve</>}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(p.id, p.user_id, 'reject')}
                          disabled={processing === p.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPayments;
