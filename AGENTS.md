# Project rules

- Generation prices live only in `supabase/functions/_shared/pricing.ts`; the browser sends what to generate, never an amount. Why: client-sent prices let users generate for free.
- Every edge function that calls an AI provider must call `requireCharge` (from `_shared/billing.ts`) before the provider and refund via `refundCharge`/`withRefundOnFailure` on failure. Why: one paid charge per job, one use per step, credits returned when nothing is delivered.
- Credit charge/claim/refund database functions are executable by `service_role` only. Why: app users must not move their own balances.
