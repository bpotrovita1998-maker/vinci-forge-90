# Project rules

- Generation prices live only in `supabase/functions/_shared/pricing.ts`; the browser sends what to generate, never an amount. Why: client-sent prices let users generate for free.
- Every edge function that calls an AI provider must call `requireCharge` (from `_shared/billing.ts`) before the provider and refund via `refundCharge`/`withRefundOnFailure` on failure. Why: one paid charge per job, one use per step, credits returned when nothing is delivered.
- Credit charge/claim/refund database functions are executable by `service_role` only. Why: app users must not move their own balances.
- Plans, storage quotas, monthly credits and credit packs live only in `supabase/functions/_shared/subscription-plans.ts` (the browser re-exports it). Why: one list for checkout, webhooks, quotas and the Pricing page.
- Credits are added only through the idempotent `grant_credits` function with a unique ref (`invoice:<id>`, `checkout:<id>`). Why: the webhook, the return page and the subscription check may all fire for the same payment.
