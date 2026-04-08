import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  currentUsage?: string;
  limit?: string;
}

const UpgradeModal = ({ open, onOpenChange, feature, currentUsage, limit }: UpgradeModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center justify-center gap-2">
            <Lock className="h-5 w-5 text-destructive" /> Plan Limit Reached
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <Crown className="h-8 w-8 text-accent" />
          </div>
          <p className="text-sm text-muted-foreground">
            {feature}
          </p>
          {currentUsage && limit && (
            <p className="text-xs font-medium bg-muted rounded-lg p-2">
              Current usage: <span className="text-foreground font-bold">{currentUsage}</span> / <span className="text-foreground font-bold">{limit}</span>
            </p>
          )}
          <Button className="w-full" onClick={() => { onOpenChange(false); navigate('/subscription'); }}>
            <Crown className="h-4 w-4 mr-2" /> Upgrade to Premium
          </Button>
          <p className="text-xs text-muted-foreground">
            Unlock unlimited branches, products, sales, staff accounts & more.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
