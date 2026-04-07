import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, TrendingUp, Package, Users } from 'lucide-react';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  // If ref param present, default to signup
  useEffect(() => {
    if (searchParams.get('ref')) setIsLogin(false);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          if (businessName) {
            await supabase.from('profiles').update({ business_name: businessName }).eq('user_id', data.user.id);
          }
          // Record referral if code provided
          if (referralCode.trim()) {
            const { data: referrerProfile } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('referral_code', referralCode.trim().toUpperCase())
              .single();
            
            if (referrerProfile) {
              await supabase.from('referrals').insert({
                referrer_user_id: referrerProfile.user_id,
                referred_user_id: data.user.id,
                referral_code: referralCode.trim().toUpperCase(),
                reward_status: 'pending',
              });
            }
          }
        }
        toast({ title: 'Account created!', description: 'Welcome to SmartBiz Manager!' });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, label: 'Sales Tracking' },
    { icon: Package, label: 'Inventory' },
    { icon: TrendingUp, label: 'Expenses' },
    { icon: Users, label: 'Customers' },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div>
          <h1 className="text-3xl font-heading font-bold text-sidebar-primary-foreground">
            <span className="text-sidebar-primary">Smart</span>Biz Manager
          </h1>
          <p className="mt-2 text-sidebar-foreground/70">Your business, simplified.</p>
        </div>
        <div className="space-y-6">
          <h2 className="text-2xl font-heading font-semibold text-sidebar-primary-foreground">
            Everything you need to run your business
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 bg-sidebar-accent rounded-lg p-4">
                <Icon className="h-5 w-5 text-sidebar-primary" />
                <span className="text-sidebar-foreground text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sidebar-foreground/50 text-sm">© 2026 SmartBiz Manager</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <div className="lg:hidden mb-4">
              <h1 className="text-2xl font-heading font-bold">
                <span className="text-primary">Smart</span>Biz
              </h1>
            </div>
            <CardTitle className="text-2xl font-heading">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </CardTitle>
            <CardDescription>
              {isLogin ? 'Sign in to your dashboard' : 'Start managing your business today'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="My Business"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referralCode">Referral Code (optional)</Label>
                    <Input
                      id="referralCode"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="Enter referral code"
                      className="uppercase"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
