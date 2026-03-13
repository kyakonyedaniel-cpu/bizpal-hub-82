import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatUGX } from '@/lib/currency';
import { CreditCard, Check, Crown, Zap, Loader2 } from 'lucide-react';

const Subscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [initiating, setInitiating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, paymentsRes, subRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1),
      ]);
      setProfile(profileRes.data);
      setPayments(paymentsRes.data || []);
      setSubscription(subRes.data?.[0] || null);
    };
    fetchData();
  }, [user]);

  const initiatePesapalPayment = async () => {
    if (!user) return;
    setInitiating(true);
    try {
      const { data, error } = await supabase.functions.invoke('pesapal-checkout', {
        body: { user_id: user.id, email: user.email, amount: 2000, currency: 'UGX' },
      });
      if (error) throw error;
      if (data?.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        toast({ title: 'Error', description: 'Failed to get payment URL', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Payment Error', description: err.message || 'Could not initiate payment', variant: 'destructive' });
    } finally {
      setInitiating(false);
    }
  };

  const isPremium = profile?.plan === 'premium';
  const endDate = subscription?.end_date ? new Date(subscription.end_date) : null;

  const freeFeatures = ['Single branch', 'Up to 50 sales records', 'Basic reports', 'Limited products'];
  const premiumFeatures = ['Multi-branch support', 'Unlimited sales & products', 'Staff accounts & roles', 'Advanced reports & PDF export', 'Offline sync', 'Priority support'];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
        <CreditCard className="h-6 w-6" /> Subscription
      </h1>

      {isPremium && endDate && (
        <Card className="glass-card border-accent/30">
          <CardContent className="p-4">
            <p className="text-sm">Your Premium subscription is active until <span className="font-bold">{endDate.toLocaleDateString()}</span></p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <Card className={`glass-card ${isPremium ? 'ring-2 ring-primary' : 'border-accent/50'}`}>
          <CardHeader>
            <CardTitle className="font-heading flex items-center justify-between">
              <span className="flex items-center gap-2"><Crown className="h-5 w-5 text-accent" /> Premium</span>
              {isPremium && <Badge>Current</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-heading font-bold">{formatUGX(2000)}<span className="text-sm text-muted-foreground font-normal">/month</span></p>
            <ul className="space-y-2">
              {premiumFeatures.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-accent" /> {f}
                </li>
              ))}
            </ul>
            {!isPremium && (
              <Button className="w-full" onClick={initiatePesapalPayment} disabled={initiating}>
                {initiating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : 'Upgrade to Premium — Pay Now'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
};

export default Subscription;
