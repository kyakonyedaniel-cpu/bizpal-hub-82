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

interface Counts {
  plan: string;
  branchCount: number;
  salesCount: number;
  productCount: number;
}

// Every page that shows a plan badge used to fire four fresh queries on mount,
// which on a slow connection meant seconds of waiting on each navigation.
// Counts are cached briefly and concurrent mounts share one request.
const CACHE_TTL_MS = 30_000;
let cache: { userId: string; at: number; counts: Counts } | null = null;
let inFlight: { userId: string; promise: Promise<Counts> } | null = null;

const fetchCounts = async (userId: string): Promise<Counts> => {
  if (inFlight && inFlight.userId === userId) return inFlight.promise;

  const promise = (async () => {
    const [profileRes, branchRes, salesRes, productRes] = await Promise.all([
      supabase.from('profiles').select('plan').eq('user_id', userId).single(),
      supabase.from('branches').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('sales').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    return {
      plan: profileRes.data?.plan || 'free',
      branchCount: branchRes.count || 0,
      salesCount: salesRes.count || 0,
      productCount: productRes.count || 0,
    };
  })();

  inFlight = { userId, promise };
  try {
    const counts = await promise;
    cache = { userId, at: Date.now(), counts };
    return counts;
  } finally {
    if (inFlight && inFlight.promise === promise) inFlight = null;
  }
};

export const usePlanLimits = (): PlanLimits => {
  const { user } = useAuth();
  const [plan, setPlan] = useState(cache?.counts.plan || 'free');
  const [branchCount, setBranchCount] = useState(cache?.counts.branchCount || 0);
  const [salesCount, setSalesCount] = useState(cache?.counts.salesCount || 0);
  const [productCount, setProductCount] = useState(cache?.counts.productCount || 0);
  const [loading, setLoading] = useState(!cache);

  const apply = (counts: Counts) => {
    setPlan(counts.plan);
    setBranchCount(counts.branchCount);
    setSalesCount(counts.salesCount);
    setProductCount(counts.productCount);
    setLoading(false);
  };

  // Always hits the network. Called after adding a sale/product/branch so the
  // counters and the paywall stay accurate.
  const refresh = async () => {
    if (!user) return;
    apply(await fetchCounts(user.id));
  };

  useEffect(() => {
    if (!user) return;
    if (cache && cache.userId === user.id && Date.now() - cache.at < CACHE_TTL_MS) {
      apply(cache.counts);
      return;
    }
    refresh();
  }, [user]);

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
