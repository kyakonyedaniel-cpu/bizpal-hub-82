import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Branch {
  id: string;
  user_id: string;
  branch_name: string;
  location: string | null;
  created_at: string;
}

interface BranchContextType {
  branches: Branch[];
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch | null) => void;
  loading: boolean;
  refreshBranches: () => Promise<void>;
  allBranchesMode: boolean;
  setAllBranchesMode: (v: boolean) => void;
}

const BranchContext = createContext<BranchContextType>({
  branches: [],
  currentBranch: null,
  setCurrentBranch: () => {},
  loading: true,
  refreshBranches: async () => {},
  allBranchesMode: true,
  setAllBranchesMode: () => {},
});

export const useBranch = () => useContext(BranchContext);

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [allBranchesMode, setAllBranchesMode] = useState(true);
  const [loading, setLoading] = useState(true);

  const refreshBranches = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('user_id', user.id)
      .order('branch_name');
    setBranches((data as Branch[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) refreshBranches();
    else {
      setBranches([]);
      setCurrentBranch(null);
      setLoading(false);
    }
  }, [user]);

  return (
    <BranchContext.Provider value={{ branches, currentBranch, setCurrentBranch, loading, refreshBranches, allBranchesMode, setAllBranchesMode }}>
      {children}
    </BranchContext.Provider>
  );
};
