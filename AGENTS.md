# Project rules

- Generation prices live only in `supabase/functions/_shared/pricing.ts`; the browser sends what to generate, never an amount. Why: client-sent prices let users generate for free.
- Every edge function that calls an AI provider must call `requireCharge` (from `_shared/billing.ts`) before the provider and refund via `refundCharge`/`withRefundOnFailure` on failure. Why: one paid charge per job, one use per step, credits returned when nothing is delivered.
- Credit charge/claim/refund database functions are executable by `service_role` only. Why: app users must not move their own balances.
- Plans, storage quotas, monthly credits and credit packs live only in `supabase/functions/_shared/subscription-plans.ts` (the browser re-exports it). Why: one list for checkout, webhooks, quotas and the Pricing page.
- Credits are added only through the idempotent `grant_credits` function with a unique ref (`invoice:<id>`, `checkout:<id>`). Why: the webhook, the return page and the subscription check may all fire for the same payment.
- Generated media (images, videos, 3D/CAD) must be uploaded to the `generated-models` bucket and saved as permanent public URLs; never store base64, signed URLs or provider (replicate.delivery) URLs in `jobs.outputs`. Why: signed and provider links expire and base64 bloats the database.
- Admin (GM) generations run in owner mode inside `charge_generation`: no app credits move, a `source: owner` usage log is still written so step claims and refunds work. Why: the owner pays the AI provider directly and must see real behaviour without fake credits.
- Every AI provider job is logged in `provider_runs` with an estimated USD cost from `PROVIDER_USD_PER_SECOND` in `_shared/pricing.ts` (via `recordProviderRun`). Why: owner spend reports and the Replicate low-balance warning.
- Scene videos use `wan-video/wan-2.5-t2v`, or `wan-video/wan-2.5-i2v` when a start frame exists (continuations, animated pictures); the "-fast" Wan 2.5 variants fail with E002. Why: continue-video chains clips from the previous clip's last frame.
