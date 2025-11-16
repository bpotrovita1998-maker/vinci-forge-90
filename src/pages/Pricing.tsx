import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

export default function Pricing() {
  const navigate = useNavigate();
  const { subscription, tokenBalance, isAdmin } = useSubscription();

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
            <CardTitle className="text-2xl">Monthly Subscription</CardTitle>
            <CardDescription>Access to all features with token-based usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">$1</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-2">
              {[
                "Access to AI image generation",
                "Access to AI video generation",
                "Image vectorization (1920x1080)",
                "Gallery storage",
                "Priority support"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {subscription?.status === 'active' ? (
              <Button disabled className="w-full">Current Plan</Button>
            ) : (
              <Button className="w-full" onClick={() => navigate('/')}>
                Subscribe Now
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Token Packages */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center">Buy Tokens</h2>
          <p className="text-center text-muted-foreground mb-4">
            Purchase tokens to power your AI generations. Each generation costs tokens based on complexity.
          </p>
          <div className="bg-muted/30 rounded-lg p-4 mb-8 text-center text-sm">
            <span className="font-semibold">Token Costs:</span> Image = 1 token ($0.01) • Video = 30 tokens ($0.30) • 3D/CAD = 10 tokens ($0.10)
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
                    No markup - you pay exactly what we pay: Images $0.01 • Videos $0.30 • 3D/CAD $0.10
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    disabled={!subscription || subscription.status !== 'active'}
                    onClick={() => {
                      // TODO: Integrate Stripe checkout
                      alert('Stripe integration coming soon!');
                    }}
                  >
                    Buy Tokens
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
