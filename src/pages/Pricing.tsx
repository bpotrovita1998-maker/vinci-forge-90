import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Loader2, Play, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { StorageUsageBar } from "@/components/storage-plans-section";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import {
  CREDIT_PACKS,
  CREDIT_PRICES,
  SUBSCRIPTION_PLANS,
  formatCents,
  formatNumber,
  itemsFor,
} from "@/lib/subscription-plans";
import {
  confirmCreditPack,
  openBillingPortal,
  startCreditPackCheckout,
  startPlanCheckout,
  syncMySubscription,
} from "@/services/billing-service";

const PLAN_TAGLINES: Record<string, string> = {
  creator: "For solo creators getting started with video",
  studio: "For teams producing content every week",
  business: "For agencies and high-volume brands",
};

export function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { tokenBalance, isAdmin, plan, refreshData } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const handledRef = useRef<string | null>(null);

  const showError = (title: string, error: unknown) =>
    toast({ title, description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });

  // Returning from checkout: confirm the plan or credit pack
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const tokenSessionId = searchParams.get("token_session_id");
    const key = sessionId ?? tokenSessionId;
    if (!key || handledRef.current === key) return;
    handledRef.current = key;

    const run = async () => {
      try {
        if (sessionId) {
          const result = await syncMySubscription();
          const name = SUBSCRIPTION_PLANS.find((p) => p.id === result.plan)?.name;
          toast({ title: name ? `Welcome to ${name}!` : "Payment received", description: "Your plan is active and your monthly credits were added." });
        } else if (tokenSessionId) {
          const added = await confirmCreditPack(tokenSessionId);
          toast({ title: "Credits added", description: added > 0 ? `${formatNumber(added)} credits were added to your account.` : "These credits were already added." });
        }
        await refreshData(true);
      } catch (error) {
        showError("We couldn't confirm your payment", error);
      } finally {
        navigate("/pricing", { replace: true });
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const goTo = async (key: string, getUrl: () => Promise<string>, errorTitle: string) => {
    setLoading(key);
    try {
      window.location.href = await getUrl();
    } catch (error) {
      showError(errorTitle, error);
      setLoading(null);
    }
  };

  const hasPlan = plan !== "free";
  const videoPrices = CREDIT_PRICES.video;

  return (
    <>
      <SEO
        title="Pricing"
        description="Creator, Studio and Business plans with storage and monthly AI credits included, plus credit packs when you need more."
        keywords="VinciAI pricing, AI video generator cost, subscription plans, AI credits"
      />
      <div className="h-20" />
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 py-12 px-4">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent px-4 py-2 leading-tight">
              Choose your plan
            </h1>
            <p className="text-muted-foreground text-lg px-4">
              Every plan includes storage, the platform and a monthly credit allowance. Credits pay for what you generate.
            </p>
          </div>

          {/* Current plan */}
          <Card className="bg-muted/40" data-testid="current-plan">
            <CardContent className="pt-6 grid gap-4 md:grid-cols-3 md:items-center">
              <div>
                <p className="text-sm text-muted-foreground">Your plan</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  <span data-testid="current-plan-name">{SUBSCRIPTION_PLANS.find((p) => p.id === plan)?.name ?? "Free"}</span>
                  {isAdmin && <Badge variant="secondary">GM</Badge>}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits available</p>
                <p className="text-2xl font-bold text-primary" data-testid="credit-balance">{formatNumber(Number(tokenBalance?.balance ?? 0))}</p>
              </div>
              <div className="space-y-3">
                <StorageUsageBar />
                {hasPlan && (
                  <Button variant="outline" className="w-full" disabled={loading === "portal"}
                    onClick={() => goTo("portal", openBillingPortal, "We couldn't open your billing page")}>
                    {loading === "portal" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                    Manage subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plans */}
          <section aria-labelledby="plans-heading" className="space-y-6">
            <h2 id="plans-heading" className="text-2xl font-bold text-center">Monthly plans</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="flex flex-col border-border/50">
                <CardHeader>
                  <div className="flex items-center gap-2"><Play className="h-5 w-5 text-muted-foreground" /><CardTitle>Free</CardTitle></div>
                  <CardDescription>Try VinciAI with free images</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p><span className="text-4xl font-bold">{formatCents(0)}</span></p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0" />5 free images to start</li>
                                        <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0" />2 GB storage, files kept 24h</li>
                    <li className="flex gap-2 text-muted-foreground"><X className="h-4 w-4 shrink-0" />No video, 3D or CAD</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/create")}>Start free</Button>
                </CardFooter>
              </Card>

              {SUBSCRIPTION_PLANS.map((p) => {
                const isCurrent = plan === p.id;
                return (
                  <Card key={p.id} data-testid={`plan-${p.id}`}
                    className={`flex flex-col relative ${isCurrent ? "border-primary shadow-lg shadow-primary/20" : p.id === "studio" ? "border-primary/40" : "border-border/50"}`}>
                    {isCurrent && <Badge className="absolute top-4 right-4">Your plan</Badge>}
                    {!isCurrent && p.id === "studio" && <Badge variant="secondary" className="absolute top-4 right-4">Popular</Badge>}
                    <CardHeader>
                      <CardTitle>{p.name}</CardTitle>
                      <CardDescription>{PLAN_TAGLINES[p.id]}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <p><span className="text-4xl font-bold">{formatCents(p.priceCents)}</span><span className="text-muted-foreground"> / month</span></p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0" /><span><strong>{formatNumber(p.monthlyCredits)}</strong> credits every month</span></li>
                        <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0" /><span><strong>{p.storageLabel}</strong> storage included</span></li>
                        <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0" />Images, video, 3D and CAD</li>
                        <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0" />Files kept while subscribed</li>
                        <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0" />Buy extra credits any time</li>
                      </ul>
                      <p className="text-xs text-muted-foreground">
                        About {formatNumber(itemsFor(p.monthlyCredits, CREDIT_PRICES.image))} images, or {formatNumber(itemsFor(p.monthlyCredits, videoPrices.animatediff))} Wan videos, or {formatNumber(itemsFor(p.monthlyCredits, videoPrices.veo))} Veo 3.1 videos.
                      </p>
                    </CardContent>
                    <CardFooter>
                      {isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>Current plan</Button>
                      ) : hasPlan ? (
                        <Button variant="outline" className="w-full" disabled={loading === "portal"}
                          onClick={() => goTo("portal", openBillingPortal, "We couldn't open your billing page")}>
                          Switch to {p.name}
                        </Button>
                      ) : (
                        <Button className="w-full" disabled={loading === p.id}
                          onClick={() => goTo(p.id, () => startPlanCheckout(p.id), "We couldn't open the checkout")}>
                          {loading === p.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Choose {p.name}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Generation prices */}
          <Card className="bg-muted/40">
            <CardHeader>
              <CardTitle>What each creation costs</CardTitle>
              <CardDescription>1 credit = {formatCents(1)}. Failed generations are refunded automatically.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm" data-testid="generation-prices">
              <div className="flex justify-between rounded-md bg-background/60 p-3"><span>Image or image edit</span><strong>{CREDIT_PRICES.image} credits</strong></div>
              <div className="flex justify-between rounded-md bg-background/60 p-3"><span>Wan 2.5 video</span><strong>{videoPrices.animatediff} credits</strong></div>
              <div className="flex justify-between rounded-md bg-background/60 p-3"><span>Haiper video</span><strong>{videoPrices.haiper} credits</strong></div>
              <div className="flex justify-between rounded-md bg-background/60 p-3"><span>Veo 3.1 video</span><strong>{videoPrices.veo} credits</strong></div>
              <div className="flex justify-between rounded-md bg-background/60 p-3"><span>3D or CAD model</span><strong>{CREDIT_PRICES["3d"]} credits</strong></div>
              <div className="flex justify-between rounded-md bg-background/60 p-3"><span>Video scene redo</span><strong>Same as the video model</strong></div>
            </CardContent>
          </Card>

          {/* Credit packs */}
          <section aria-labelledby="packs-heading" className="space-y-6">
            <div className="text-center space-y-2">
              <h2 id="packs-heading" className="text-2xl font-bold">Need more credits?</h2>
              <p className="text-muted-foreground">Top up any time with an active plan. Bigger packs include bonus credits. Credits never expire.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {CREDIT_PACKS.map((pack) => {
                const bonus = pack.credits - pack.priceCents;
                return (
                  <Card key={pack.id} data-testid={pack.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-3xl">{formatCents(pack.priceCents)}</CardTitle>
                      <CardDescription>
                        {formatNumber(pack.credits)} credits{bonus > 0 && <span className="text-primary"> (+{formatNumber(bonus)} bonus)</span>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 text-sm text-muted-foreground space-y-1">
                      <p>≈ {formatNumber(itemsFor(pack.credits, CREDIT_PRICES.image))} images</p>
                      <p>≈ {formatNumber(itemsFor(pack.credits, videoPrices.animatediff))} Wan videos</p>
                      <p>≈ {formatNumber(itemsFor(pack.credits, videoPrices.veo))} Veo 3.1 videos</p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" variant={hasPlan || isAdmin ? "default" : "outline"} disabled={loading === pack.id}
                        onClick={() => goTo(pack.id, () => startCreditPackCheckout(pack.id), "We couldn't open the checkout")}>
                        {loading === pack.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Buy credits
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default Pricing;
