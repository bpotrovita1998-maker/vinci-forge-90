import { useSubscription } from '@/hooks/useSubscription';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FreeUserExpirationBanner() {
  const { isAdmin, subscription } = useSubscription();
  const navigate = useNavigate();
  
  const isPro = isAdmin || subscription?.status === 'active';
  
  // Don't show banner for PRO users
  if (isPro) return null;
  
  return (
    <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
      <Clock className="h-4 w-4 text-amber-500" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-amber-200">
          <strong>Free Tier:</strong> Your generated images expire after <strong>24 hours</strong>. 
          Download them to save permanently, or upgrade to PRO for unlimited cloud storage.
        </div>
        <div className="flex gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-amber-500/50 text-amber-200 hover:bg-amber-500/20"
            onClick={() => navigate('/pricing')}
          >
            Upgrade to PRO
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}