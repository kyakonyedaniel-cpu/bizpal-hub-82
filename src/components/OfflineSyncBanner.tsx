import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getOfflineSales, getOfflineExpenses, clearOfflineSales, clearOfflineExpenses } from '@/lib/offlineDb';
import { useToast } from '@/hooks/use-toast';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OfflineSyncBanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      syncData();
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    checkPending();
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [user]);

  const checkPending = async () => {
    const sales = await getOfflineSales();
    const expenses = await getOfflineExpenses();
    setPendingCount(sales.length + expenses.length);
  };

  const syncData = async () => {
    if (!user || syncing) return;
    setSyncing(true);

    const sales = await getOfflineSales();
    const expenses = await getOfflineExpenses();

    if (sales.length > 0) {
      const cleaned = sales.map(({ id, _offline, _timestamp, ...rest }) => rest);
      const { error } = await supabase.from('sales').insert(cleaned);
      if (!error) await clearOfflineSales();
      else console.error('Sync sales error:', error);
    }

    if (expenses.length > 0) {
      const cleaned = expenses.map(({ id, _offline, _timestamp, ...rest }) => rest);
      const { error } = await supabase.from('expenses').insert(cleaned);
      if (!error) await clearOfflineExpenses();
      else console.error('Sync expenses error:', error);
    }

    setSyncing(false);
    await checkPending();

    if (sales.length + expenses.length > 0) {
      toast({ title: 'Offline data synced!', description: `${sales.length} sales and ${expenses.length} expenses uploaded.` });
    }
  };

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className="bg-warning/10 border border-warning/30 text-warning rounded-lg px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        {isOffline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You're offline. Data will sync when connected.</span>
          </>
        ) : (
          <>
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{pendingCount} records pending sync</span>
          </>
        )}
      </div>
      {!isOffline && pendingCount > 0 && (
        <Button variant="outline" size="sm" onClick={syncData} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      )}
    </div>
  );
};

export default OfflineSyncBanner;
