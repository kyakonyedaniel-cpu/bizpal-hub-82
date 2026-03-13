import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, User, Building2, CreditCard, Moon, MessageCircle, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const Settings = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [businessName, setBusinessName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappReportsEnabled, setWhatsappReportsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (data) {
        setProfile(data);
        setBusinessName(data.business_name || '');
        setWhatsappNumber((data as any).whatsapp_number || '');
        setWhatsappReportsEnabled((data as any).whatsapp_reports_enabled || false);
      }
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      business_name: businessName,
      whatsapp_number: whatsappNumber,
      whatsapp_reports_enabled: whatsappReportsEnabled,
    } as any).eq('id', profile.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved!' });
    }
  };

  const sendTestReport = async () => {
    if (!user) return;
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-report', {
        body: {},
      });
      if (error) throw error;
      
      const reports = data?.reports || [];
      if (reports.length > 0 && reports[0].message) {
        const phone = whatsappNumber?.replace(/[^0-9]/g, '') || '';
        const waUrl = phone
          ? `https://wa.me/${phone}?text=${encodeURIComponent(reports[0].message)}`
          : `https://wa.me/?text=${encodeURIComponent(reports[0].message)}`;
        window.open(waUrl, '_blank');
        toast({ title: 'Test report generated!', description: 'Opening WhatsApp...' });
      } else {
        toast({ title: 'Report generated', description: 'No data found for today.' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSendingTest(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
        <SettingsIcon className="h-6 w-6" /> Settings
      </h1>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Business Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your Business Name" />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value="UGX — Ugandan Shillings" disabled className="bg-muted" />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" /> WhatsApp Daily Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Daily Reports</p>
              <p className="text-xs text-muted-foreground">Get a business summary every day at 9 PM</p>
            </div>
            <Switch checked={whatsappReportsEnabled} onCheckedChange={setWhatsappReportsEnabled} />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp Phone Number</Label>
            <Input
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="e.g. 256700123456"
              type="tel"
            />
            <p className="text-xs text-muted-foreground">Include country code without + (e.g. 256 for Uganda)</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button variant="outline" onClick={sendTestReport} disabled={sendingTest}>
              <Send className="h-4 w-4 mr-2" />
              {sendingTest ? 'Generating...' : 'Send Test Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">User ID</span>
            <span className="text-xs font-mono text-muted-foreground">{user?.id?.slice(0, 8)}...</span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Plan</span>
            <Badge variant={profile?.plan === 'premium' ? 'default' : 'secondary'}>
              {profile?.plan === 'premium' ? 'Premium' : 'Free'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sales Recorded</span>
            <span className="text-sm font-heading font-bold">{profile?.sales_count || 0}{profile?.plan !== 'premium' ? ' / 50' : ''}</span>
          </div>
          <Link to="/subscription">
            <Button variant="outline" className="w-full mt-2">
              Manage Subscription
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
