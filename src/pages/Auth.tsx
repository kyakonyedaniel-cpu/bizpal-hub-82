import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, TrendingUp, Package, Users, KeyRound, CheckCircle } from 'lucide-react';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'done'>('email');
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

  useEffect(() => {
    if (searchParams.get('ref')) setIsLogin(false);
  }, [searchParams]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: 'Error', description: 'Please enter your email address.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    // Send OTP via Supabase (email OTP for password recovery)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Code sent!', description: 'Check your email for a 6-digit verification code.' });
      setResetStep('otp');
    }
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast({ title: 'Error', description: 'Please enter the 6-digit code.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    // Verify OTP first
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    if (verifyError) {
      setLoading(false);
      toast({ title: 'Error', description: 'Invalid or expired code. Please try again.', variant: 'destructive' });
      return;
    }
    // Now update password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) {
      toast({ title: 'Error', description: updateError.message, variant: 'destructive' });
    } else {
      setResetStep('done');
      toast({ title: 'Password updated!', description: 'You can now sign in with your new password.' });
      // Sign out so they can log in fresh
      await supabase.auth.signOut();
    }
  };

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

  const renderForgotPassword = () => {
    if (resetStep === 'done') {
      return (
        <div className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-heading font-semibold text-lg">Password Updated!</h3>
          <p className="text-sm text-muted-foreground">Your password has been reset successfully.</p>
          <Button className="w-full" onClick={() => { setIsForgotPassword(false); setResetStep('email'); setOtp(''); setNewPassword(''); setConfirmNewPassword(''); }}>
            Sign In
          </Button>
        </div>
      );
    }

    if (resetStep === 'otp') {
      return (
        <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
          <div className="text-center mb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to <strong>{email}</strong></p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6} required className="text-center text-lg tracking-widest" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
            <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying...' : 'Reset Password'}
          </Button>
          <div className="text-center">
            <button type="button" onClick={() => { setResetStep('email'); setOtp(''); }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Resend code
            </button>
          </div>
        </form>
      );
    }

    return (
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="resetEmail">Email</Label>
          <Input id="resetEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending...' : 'Send Verification Code'}
        </Button>
        <div className="text-center">
          <button type="button" onClick={() => { setIsForgotPassword(false); setResetStep('email'); }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Back to Sign In
          </button>
        </div>
      </form>
    );
  };

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
              {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome back' : 'Create your account'}
            </CardTitle>
            <CardDescription>
              {isForgotPassword
                ? (resetStep === 'otp' ? 'Verify your identity and set a new password' : 'Enter your email to receive a verification code')
                : isLogin ? 'Sign in to your dashboard' : 'Start managing your business today'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isForgotPassword ? renderForgotPassword() : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="My Business" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="referralCode">Referral Code {searchParams.get('ref') ? '' : '(optional)'}</Label>
                        <Input
                          id="referralCode"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                          placeholder="Enter referral code"
                          className="uppercase"
                          readOnly={!!searchParams.get('ref')}
                        />
                        {searchParams.get('ref') && (
                          <p className="text-xs text-primary">🎉 Referral code applied! You'll both get rewards.</p>
                        )}
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {isLogin && (
                        <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-primary hover:underline">
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>
                <div className="mt-6 text-center">
                  <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
