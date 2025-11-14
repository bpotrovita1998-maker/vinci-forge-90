import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export default function ProtectedRoute({ children, requireTokens = false }: { children: React.ReactNode; requireTokens?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const { canUseService, hasTokens, loading: subLoading, isAdmin, tokenBalance } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const loading = authLoading || subLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Admin users bypass all checks
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check subscription status
  if (!canUseService) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Subscription Required</AlertTitle>
            <AlertDescription>
              You need an active subscription to use VinciAI features. Subscribe now for just $1/month!
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/pricing')} className="w-full" size="lg">
            View Pricing Plans
          </Button>
        </div>
      </div>
    );
  }

  // Check token balance if required
  if (requireTokens && !hasTokens) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Insufficient Tokens</AlertTitle>
            <AlertDescription>
              You don't have enough tokens to generate content. Purchase more tokens to continue.
              <div className="mt-2">
                Current balance: <strong>{tokenBalance?.balance || 0} tokens</strong>
              </div>
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/pricing')} className="w-full" size="lg">
            Buy Tokens
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
