import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requireTokens?: boolean;
}

export const SubscriptionGuard = ({ children, requireTokens = false }: SubscriptionGuardProps) => {
  const { canUseService, hasTokens, loading, isAdmin, subscription, tokenBalance } = useSubscription();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  // Allow users with free tokens to access features without subscription
  const freeTokensAvailable = (tokenBalance?.free_tokens_granted || 0) - (tokenBalance?.free_tokens_used || 0);
  const hasFreeTokens = freeTokensAvailable > 0;

  if (!canUseService && !hasFreeTokens) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Subscription or Free Tokens Required</AlertTitle>
          <AlertDescription>
            You've used all your free tokens. Subscribe now for just $3/month to continue creating!
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/pricing')} className="w-full" size="lg">
          View Pricing Plans
        </Button>
      </div>
    );
  }

  if (requireTokens && !hasTokens) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-6">
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
    );
  }

  return <>{children}</>;
};
