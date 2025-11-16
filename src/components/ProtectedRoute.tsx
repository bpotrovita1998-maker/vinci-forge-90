import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export default function ProtectedRoute({ 
  children, 
  requireTokens = false,
  requireAuth = true,
  skipSubscriptionCheck = false
}: { 
  children: React.ReactNode; 
  requireTokens?: boolean;
  requireAuth?: boolean;
  skipSubscriptionCheck?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const { canUseService, hasTokens, loading: subLoading, isAdmin, tokenBalance } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user && requireAuth) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate, requireAuth]);

  const loading = authLoading || subLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && requireAuth) {
    return null;
  }

  // Skip subscription checks if specified (e.g., for pricing page)
  if (skipSubscriptionCheck) {
    return <>{children}</>;
  }

  // Admin users bypass all checks
  if (isAdmin) {
    return <>{children}</>;
  }

  // Calculate free tokens available
  const freeTokensAvailable = (tokenBalance?.free_tokens_granted || 0) - (tokenBalance?.free_tokens_used || 0);
  const hasFreeTokens = freeTokensAvailable > 0;

  // Allow access if user has subscription OR free tokens
  if (!canUseService && !hasFreeTokens) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Welcome to VinciAI!</AlertTitle>
            <AlertDescription>
              You've used all your free tokens. Subscribe now for just $3/month to unlock unlimited AI generation with 32GB storage!
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/pricing')} className="w-full" size="lg">
            View Pricing Plans
          </Button>
        </div>
      </div>
    );
  }

  // Show free tokens remaining message if user is using free tokens
  if (hasFreeTokens && !canUseService && requireTokens) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="bg-primary/10 border-b border-primary/20 p-4 text-center">
          <p className="text-sm">
            🎁 You have <strong>{freeTokensAvailable} free image generations</strong> remaining. 
            <Button variant="link" onClick={() => navigate('/pricing')} className="ml-2 p-0 h-auto">
              Subscribe for unlimited access
            </Button>
          </p>
        </div>
        {children}
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
