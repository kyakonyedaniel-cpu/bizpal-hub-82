import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface PlanLimits {
  plan: string;
  isPremium: boolean;
  branchCount: number;
  salesCount: number;
  productCount: number;
  maxBranches: number;
  maxSales: number;
  maxProducts: number;
  canAddBranch: boolean;
  canAddSale: boolean;
  canAddProduct: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const FREE_LIMITS = { maxBranches: 1, maxSales: 50, maxProducts: 20 };
const PREMIUM_LIMITS = { maxBranches: Infinity, maxSales: Infinity, maxProducts: Infinity };

export const usePlanLimits = (): PlanLimits => {
  const { user } = useAuth();
  const [plan, setPlan] = useState('free');
  const [branchCount, setBranchCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    const [profileRes, branchRes, salesRes, productRes] = await Promise.all([
      supabase.from('profiles').select('plan').eq('user_id', user.id).single(),
      supabase.from('branches').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('sales').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setPlan(profileRes.data?.plan || 'free');
    setBranchCount(branchRes.count || 0);
    setSalesCount(salesRes.count || 0);
    setProductCount(productRes.count || 0);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  const isPremium = plan === 'premium';
  const limits = isPremium ? PREMIUM_LIMITS : FREE_LIMITS;

  return {
    plan,
    isPremium,
    branchCount,
    salesCount,
    productCount,
    maxBranches: limits.maxBranches,
    maxSales: limits.maxSales,
    maxProducts: limits.maxProducts,
    canAddBranch: isPremium || branchCount < FREE_LIMITS.maxBranches,
    canAddSale: isPremium || salesCount < FREE_LIMITS.maxSales,
    canAddProduct: isPremium || productCount < FREE_LIMITS.maxProducts,
    loading,
    refresh,
  };
};
