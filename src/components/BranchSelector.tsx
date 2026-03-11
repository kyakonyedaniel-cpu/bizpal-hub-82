import { useBranch } from '@/contexts/BranchContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

const BranchSelector = () => {
  const { branches, currentBranch, setCurrentBranch, allBranchesMode, setAllBranchesMode } = useBranch();

  if (branches.length === 0) return null;

  const handleChange = (value: string) => {
    if (value === 'all') {
      setAllBranchesMode(true);
      setCurrentBranch(null);
    } else {
      setAllBranchesMode(false);
      const branch = branches.find(b => b.id === value);
      setCurrentBranch(branch || null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={allBranchesMode ? 'all' : (currentBranch?.id || 'all')} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <SelectValue placeholder="All Branches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Branches</SelectItem>
          {branches.map(b => (
            <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default BranchSelector;
