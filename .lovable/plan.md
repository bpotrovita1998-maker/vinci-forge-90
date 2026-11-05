# Real subscription plans, credit packs and subscription management

## What the customer will see on the Pricing page
The old "VinciAI PRO" offer and the old "$20 / $30 / $50 token packages" are removed. They are replaced by:

**Monthly plans** (each one already includes storage, platform running costs and monthly credits)

| Plan | Price / month | Storage | Credits included each month | Example use |
|---|---|---|---|---|
| Creator | €24,99 | 50 GB | 1.500 | ~750 images or ~68 Wan videos |
| Studio | €69,99 | 250 GB | 4.000 | ~2.000 images or ~24 Veo videos |
| Business | €199,00 | 1 TB | 11.000 | ~5.500 images or ~66 Veo videos |

Yearly option: 20% off the platform + storage part only (credits are never discounted, so margins stay safe).

**Credit packs** (for subscribers who run out; 1 credit = €0,01, bigger packs give a small bonus)

| Pack | Credits |
|---|---|
| €10 | 1.000 |
| €25 | 2.600 |
| €50 | 5.300 |
| €100 | 11.000 |

**New generation prices** (about 35% profit over what the AI provider charges us)

| Item | Credits |
|---|---|
| Image / image edit | 2 |
| Wan 2.5 video | 22 |
| Haiper video | 42 |
| Veo 3.1 video | 165 |
| 3D / CAD model | 15 |

The page shows a clear "Your plan" badge on the plan you have, and a "Manage subscription" button that opens the billing page where you can upgrade, downgrade or cancel.

## Steps
1. **Stripe products (test mode)**: create Creator, Studio and Business monthly + yearly prices and the 4 credit packs. Retire the old PRO price, the old token packs and the separate storage-only plans (their storage is now inside the plans).
2. **Buying a plan**: one checkout for the plans. When payment completes, the account becomes active, gets the plan's storage size and that month's credits. Each renewal adds the monthly credits again. Cancelling returns the account to Free (2 GB, images only).
3. **Detect every user's plan**: the subscription check reads which plan each user pays for (Free / Creator / Studio / Business) and saves it, so the top bar and Pricing page show the right plan for everyone.
4. **Fix "Manage subscription"**: first read its error logs to confirm the cause (likely suspects: an incompatible payment library version in that function, and no billing-page settings set up in Stripe that allow switching plans). Then fix it and set up the billing page so users can switch between Creator, Studio and Business and cancel.
5. **Switch to new generation prices** (the "GO" above) in the single server price list, and update the cost text on the Pricing page to match.
6. **Scene redos cost credits**: redoing a scene calls the AI video model again, so it is charged at that model's normal price (e.g. a Veo scene redo = 165 credits), with automatic refund if the redo fails.
7. **Automated end-to-end tests** (Playwright, kept in the project) on a test account:
   - Pricing page shows the 3 plans, 4 packs and new prices; no PRO offer.
   - Buy Creator in test mode with Stripe test card 4242 4242 4242 4242, return to the app, confirm "Your plan: Creator", 1.500 credits and 50 GB.
   - "Manage subscription" opens the billing page.
   - Buy a €10 pack and confirm +1.000 credits.
   - Generate an image and confirm 2 credits are spent; a scene redo is charged.
   Plus unit tests for prices, plan contents and pack amounts.

## Technical details
- New `src/lib/subscription-plans.ts` (client display) and `supabase/functions/_shared/subscription-plans.ts` (price ID → plan, quota, monthly credits); `_shared/pricing.ts` updated to new values.
- Migration: add `plan` column to `subscriptions`; storage quota read from the subscription plan (keep `storage_subscriptions` reads working, stop selling it).
- `create-subscription-checkout` accepts `{ plan, interval }` validated with Zod; `create-token-checkout` maps the 4 new pack prices server-side.
- `stripe-webhook`: `checkout.session.completed` and `invoice.paid` grant monthly credits (idempotent per invoice ID), `customer.subscription.updated/deleted` updates plan.
- `check-subscription` returns `plan`; `useSubscription` exposes it.
- `customer-portal`: align Stripe SDK with v14.21.0 used elsewhere, configure a portal configuration with product switching between the 3 plans.
- `regenerate-scene`: add `requireCharge` / `withRefundOnFailure` priced by the scene's video model.
- Pricing page rewritten from the shared plan data; e2e test file under `e2e/` driven by Playwright.
