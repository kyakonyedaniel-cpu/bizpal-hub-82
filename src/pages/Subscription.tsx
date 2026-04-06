import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatUGX } from '@/lib/currency';
import { CreditCard, Check, Crown, Zap, Loader2, Phone, Smartphone } from 'lucide-react';

const Subscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<'MTN' | 'Airtel' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [profileRes, paymentsRes, subRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1),
    ]);
    setProfile(profileRes.data);
    setPayments(paymentsRes.data || []);
    setSubscription(subRes.data?.[0] || null);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handlePayment = async () => {
    if (!user || !selectedNetwork || !phoneNumber.trim()) {
      toast({ title: 'Missing info', description: 'Please select a network and enter your phone number.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('payments').insert({
        user_id: user.id,
        amount: 2000,
        currency: 'UGX',
        payment_method: `Mobile Money (${selectedNetwork})`,
        status: 'pending',
        phone_number: phoneNumber.trim(),
        network: selectedNetwork,
      });
      if (error) throw error;
      toast({ title: '✅ Payment submitted', description: 'Your payment request has been sent. Admin will verify and activate your subscription.' });
      setPhoneNumber('');
      setSelectedNetwork(null);
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const isPremium = profile?.plan === 'premium';
  const endDate = subscription?.end_date ? new Date(subscription.end_date) : null;

  const freeFeatures = ['Single branch', 'Up to 50 sales records', 'Basic reports', 'Limited products'];
  const premiumFeatures = ['Multi-branch support', 'Unlimited sales & products', 'Staff accounts & roles', 'Advanced reports & PDF export', 'Offline sync', 'Priority support'];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'failed': case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
        <CreditCard className="h-6 w-6" /> Subscription
      </h1>

      {isPremium && endDate && (
        <Card className="glass-card border-accent/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Crown className="h-5 w-5 text-accent" />
            <div>
              <p className="font-heading font-semibold">Premium Plan Active</p>
              <p className="text-sm text-muted-foreground">Expires: <span className="font-bold text-foreground">{endDate.toLocaleDateString()}</span></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan comparison */}
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
                <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary" /> {f}</li>
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
                <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-accent" /> {f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Money Payment Section */}
      {!isPremium && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Pay via Mobile Money
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-medium">Send {formatUGX(2000)} to:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedNetwork('MTN')}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${selectedNetwork === 'MTN' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                >
                  <Phone className="h-5 w-5 text-yellow-500" />
                  <div className="text-left">
                    <p className="font-bold text-sm">MTN Mobile Money</p>
                    <p className="text-xs text-muted-foreground">0787542972</p>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedNetwork('Airtel')}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${selectedNetwork === 'Airtel' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                >
                  <Phone className="h-5 w-5 text-red-500" />
                  <div className="text-left">
                    <p className="font-bold text-sm">Airtel Money</p>
                    <p className="text-xs text-muted-foreground">0700737512</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Your Phone Number (used for payment)</Label>
              <Input
                id="phone"
                placeholder="e.g. 0787000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handlePayment} disabled={submitting || !selectedNetwork || !phoneNumber.trim()}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "I Have Paid"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">After sending money, click "I Have Paid". Admin will verify and activate your Premium subscription.</p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading">Payment History</CardTitle>
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
                    <p className="text-xs text-muted-foreground">{(p as any).phone_number || ''} &middot; {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold">{formatUGX(Number(p.amount))}</p>
                    <Badge variant={getStatusVariant(p.status)} className="text-xs">{p.status}</Badge>
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
