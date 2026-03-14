import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatUGX } from '@/lib/currency';
import { CreditCard, Check, Crown, Zap, Loader2, RefreshCw, PartyPopper } from 'lucide-react';

const Subscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [initiating, setInitiating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showActivation, setShowActivation] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [profileRes, paymentsRes, subRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1),
    ]);
    
    const wasPremium = profile?.plan === 'premium';
    setProfile(profileRes.data);
    setPayments(paymentsRes.data || []);
    setSubscription(subRes.data?.[0] || null);

    // Show activation notification if just became premium
    if (!wasPremium && profileRes.data?.plan === 'premium') {
      setShowActivation(true);
      toast({
        title: '🎉 Subscription Activated',
        description: 'Your Premium plan is now active. Enjoy all BizPal features!',
      });
    }
  };

  useEffect(() => {
    fetchData();
    // Check for payment=complete in URL (returning from Pesapal)
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'complete') {
      // Auto-sync after returning from payment
      setTimeout(() => syncPayments(), 2000);
      window.history.replaceState({}, '', window.location.pathname);
    }
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

  const syncPayments = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-payments');
      if (error) throw error;

      if (data?.completed > 0) {
        toast({
          title: '✅ Payments synced successfully',
          description: `${data.completed} payment(s) verified, ${data.failed} failed, ${data.still_pending} still pending.`,
        });
      } else if (data?.failed > 0) {
        toast({
          title: '⚠️ Some payments could not be verified',
          description: `${data.failed} payment(s) marked as failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: '✅ Payments synced',
          description: data?.still_pending > 0 
            ? `${data.still_pending} payment(s) still processing.`
            : 'No pending payments to process.',
        });
      }

      // Refresh data after sync
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Sync Error', description: err.message || 'Could not sync payments', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const isPremium = profile?.plan === 'premium';
  const endDate = subscription?.end_date ? new Date(subscription.end_date) : null;
  const hasPendingPayments = payments.some(p => p.status === 'pending');

  const freeFeatures = ['Single branch', 'Up to 50 sales records', 'Basic reports', 'Limited products'];
  const premiumFeatures = ['Multi-branch support', 'Unlimited sales & products', 'Staff accounts & roles', 'Advanced reports & PDF export', 'Offline sync', 'Priority support'];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'verified': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
        <CreditCard className="h-6 w-6" /> Subscription
      </h1>

      {/* Activation notification banner */}
      {showActivation && isPremium && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="p-4 flex items-center gap-3">
            <PartyPopper className="h-6 w-6 text-accent shrink-0" />
            <div>
              <p className="font-heading font-bold text-accent">🎉 Subscription Activated</p>
              <p className="text-sm text-muted-foreground">Your Premium plan is now active. Enjoy all BizPal features!</p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto shrink-0" onClick={() => setShowActivation(false)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {isPremium && endDate && (
        <Card className="glass-card border-accent/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Crown className="h-5 w-5 text-accent" />
            <div>
              <p className="font-heading font-semibold">Premium Plan Active</p>
              <p className="text-sm text-muted-foreground">Expires on: <span className="font-bold text-foreground">{endDate.toLocaleDateString()}</span></p>
            </div>
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

      {/* Payment History with Sync Button */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading">Payment History</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={syncPayments}
            disabled={syncing}
          >
            {syncing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" /> Sync Payments</>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">{p.payment_method}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold">{formatUGX(Number(p.amount))}</p>
                    <Badge variant={getStatusVariant(p.status)} className="text-xs">
                      {p.status}
                    </Badge>
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

export default Subscription;
