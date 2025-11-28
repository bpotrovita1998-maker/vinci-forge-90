import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Settings } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { subscription, tokenBalance, isAdmin, refreshData } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);

  // Handle successful subscription payment
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      handleSubscriptionSuccess();
    }
  }, [searchParams]);

  // Handle successful token purchase
  useEffect(() => {
    const tokenSessionId = searchParams.get('token_session_id');
    if (tokenSessionId) {
      handleTokenPurchaseSuccess(tokenSessionId);
    }
  }, [searchParams]);

  const handleSubscriptionSuccess = async () => {
    try {
      // Check subscription status
      const { error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      
      await refreshData();
      
      toast({
        title: "Welcome to PRO!",
        description: "Your subscription is now active. You can now purchase tokens and use all features.",
      });
      
      // Clear the session_id from URL
      navigate('/pricing', { replace: true });
    } catch (error: any) {
      console.error('Error verifying subscription:', error);
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to verify subscription. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleTokenPurchaseSuccess = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-token-payment', {
        body: { session_id: sessionId }
      });
      
      if (error) throw error;
      
      await refreshData();
      
      toast({
        title: "Tokens Added!",
        description: `Successfully added ${data.tokens_added} tokens to your account.`,
      });
      
      // Clear the token_session_id from URL
      navigate('/pricing', { replace: true });
    } catch (error: any) {
      console.error('Error verifying token payment:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to verify payment. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoading('subscription');
      
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleBuyTokens = async (amount: number, tokens: number) => {
    try {
      setLoading(`token-${amount}`);
      
      const { data, error } = await supabase.functions.invoke('create-token-checkout', {
        body: { amount, tokens }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error creating token checkout:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading('portal');
      
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  // Token costs match exact AI costs (no markup - profit from $1 subscription only)
  // Image AI cost: $0.01 → charge 1 token ($0.01)
  // Video AI cost: $0.30 → charge 30 tokens ($0.30)
  // 3D/CAD AI cost: $0.10 → charge 10 tokens ($0.10)
  // Token value: 1 token = $0.01
  const tokenPackages = [
    { 
      amount: 20, 
      tokens: 2000,
      images: 2000,
      videos: 66,
      threeD: 200
    },
    { 
      amount: 30, 
      tokens: 3000,
      images: 3000,
      videos: 100,
      threeD: 300
    },
    { 
      amount: 50, 
      tokens: 5000,
      images: 5000,
      videos: 166,
      threeD: 500
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent px-4 py-2 leading-tight">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg px-4">
            Start creating amazing AI content today
          </p>
        </div>

        {/* Admin Badge */}
        {isAdmin && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
            <p className="text-primary font-semibold">🎉 Admin Account - Unlimited Access</p>
          </div>
        )}

        {/* Subscription Plan */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">VinciAI PRO</CardTitle>
            <CardDescription>Complete access to all AI creation tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">$3</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-2">
              {[
                "32GB storage included",
                "90-day file retention",
                "Unlimited AI image generation",
                "Unlimited AI video generation",
                "Unlimited 3D model generation",
                "Image vectorization (1920x1080)",
                "Priority support"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2 text-sm text-muted-foreground border-t">
              🎁 New users get 5 free image generations to start!
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {subscription?.status === 'active' ? (
              <>
                <Button disabled className="w-full">Current Plan</Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleManageSubscription}
                  disabled={loading === 'portal'}
                >
                  {loading === 'portal' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button 
                className="w-full" 
                onClick={handleSubscribe}
                disabled={loading === 'subscription'}
              >
                {loading === 'subscription' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Subscribe Now'
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Token Packages */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center">Token Packages</h2>
          <p className="text-center text-muted-foreground mb-4">
            Purchase additional tokens to power your AI generations. Requires an active PRO subscription.
          </p>
          <div className="bg-muted/30 rounded-lg p-4 mb-8 text-center text-sm space-y-1">
            <div><span className="font-semibold">Token Costs:</span> Image = 1 token ($0.01) • 3D/CAD = 10 tokens ($0.10)</div>
            <div><span className="font-semibold">Video Costs:</span> Wan 2.5 Fast = 15 tokens ($0.15) • Haiper = 30 tokens ($0.30) • Veo 3.1 = 120 tokens ($1.20)</div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {tokenPackages.map((pkg) => (
              <Card key={pkg.amount} className="relative hover:border-primary/40 transition-colors">
                <CardHeader>
                  <CardTitle className="text-3xl">${pkg.amount}</CardTitle>
                  <CardDescription>
                    {pkg.tokens.toLocaleString()} tokens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm font-semibold text-primary mb-2">
                    What you get:
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-primary">🖼️</span>
                      <span><strong>{pkg.images}</strong> AI Images</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">🎬</span>
                      <span><strong>{pkg.videos}</strong> AI Videos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">🎨</span>
                      <span><strong>{pkg.threeD}</strong> 3D Generations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">✨</span>
                      <span>Image vectorization included</span>
                    </li>
                  </ul>
                  <div className="pt-2 text-xs text-muted-foreground border-t">
                    No markup - exact AI costs: Images $0.01 • Videos $0.15-$1.20 • 3D/CAD $0.10
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    disabled={!subscription || subscription.status !== 'active' || loading === `token-${pkg.amount}`}
                    onClick={() => handleBuyTokens(pkg.amount, pkg.tokens)}
                  >
                    {loading === `token-${pkg.amount}` ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Buy Tokens'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Current Balance */}
        {tokenBalance && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Your Token Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-lg">
                <span>Available Tokens:</span>
                <span className="font-bold text-primary">{tokenBalance.balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total Purchased:</span>
                <span>{tokenBalance.total_purchased.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total Spent:</span>
                <span>{tokenBalance.total_spent.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
