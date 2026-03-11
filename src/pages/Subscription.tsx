import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatUGX } from '@/lib/currency';
import { CreditCard, Check, Crown, Zap } from 'lucide-react';

const Subscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payMethod, setPayMethod] = useState('MTN MoMo');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, paymentsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setProfile(profileRes.data);
      setPayments(paymentsRes.data || []);
    };
    fetchData();
  }, [user]);

  const handlePayment = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('payments').insert({
      user_id: user.id,
      amount: 30000,
      currency: 'UGX',
      payment_method: payMethod,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Payment recorded!', description: 'Your payment is pending verification. You will be upgraded shortly.' });
      setShowPayDialog(false);
      // Refresh payments
      const { data } = await supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setPayments(data || []);
    }
  };

  const isPremium = profile?.plan === 'premium';

  const freeFeatures = ['Single branch', 'Up to 50 sales records', 'Basic reports', 'Limited products'];
  const premiumFeatures = ['Multi-branch support', 'Unlimited sales & products', 'Staff accounts & roles', 'Advanced reports & PDF export', 'Offline sync', 'Priority support'];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
        <CreditCard className="h-6 w-6" /> Subscription
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <Card className={`glass-card ${!isPremium ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader>
            <CardTitle className="font-heading flex items-center justify-between">
              <span className="flex items-center gap-2"><Zap className="h-5 w-5" /> Free Plan</span>
              {!isPremium && <Badge>Current</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-heading font-bold">{formatUGX(0)}<span className="text-sm text-muted-foreground font-normal">/month</span></p>
            <ul className="space-y-2">
              {freeFeatures.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className={`glass-card ${isPremium ? 'ring-2 ring-primary' : 'border-accent/50'}`}>
          <CardHeader>
            <CardTitle className="font-heading flex items-center justify-between">
              <span className="flex items-center gap-2"><Crown className="h-5 w-5 text-accent" /> Premium</span>
              {isPremium && <Badge>Current</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-heading font-bold">{formatUGX(30000)}<span className="text-sm text-muted-foreground font-normal">/month</span></p>
            <ul className="space-y-2">
              {premiumFeatures.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-accent" /> {f}
                </li>
              ))}
            </ul>
            {!isPremium && (
              <Button className="w-full" onClick={() => setShowPayDialog(true)}>
                Upgrade to Premium
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card className="glass-card">
          <CardHeader><CardTitle className="font-heading">Payment History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">{p.payment_method}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold">{formatUGX(Number(p.amount))}</p>
                    <Badge variant={p.status === 'verified' ? 'default' : 'secondary'} className="text-xs">
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Upgrade to Premium</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="font-heading font-bold text-lg">Premium Plan — {formatUGX(30000)}/month</p>
              <p className="text-sm text-muted-foreground">Pay using Mobile Money and click "I Have Paid" below.</p>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Payment Instructions:</p>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>1. Open your Mobile Money app</p>
                <p>2. Send <span className="font-bold text-foreground">{formatUGX(30000)}</span> to the payment number</p>
                <p>3. Use your account email as reference</p>
                <p>4. Come back and click "I Have Paid"</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTN MoMo">MTN Mobile Money</SelectItem>
                  <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handlePayment} disabled={submitting}>
              {submitting ? 'Recording...' : "I Have Paid"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscription;
