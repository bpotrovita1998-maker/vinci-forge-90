# Make credits real and charge them on every generation

## What is wrong today
- Your GM account shows 999.999 credits plus 1.000.001 free ones. Neither was ever bought: they were typed directly into the account in the past (nothing purchased, nothing spent). That is why the number looks fake.
- When someone generates something, the browser tells the server how many credits to take. A clever user could send "0" and generate for free.
- If a generation fails at the AI provider, the credits are not given back.

## What will change

1. **Reset your GM account to real numbers**
   - Paid credits: 0 (your choice). You buy credits like any customer to test.
   - Free credits: back to the normal 5 every new user gets (3 already used, so 2 left).
   - Ad credits stay as they are (5).
   - You keep all GM powers (every feature unlocked, admin pages), but you pay credits per generation like a real user.

2. **Prices decided by the server, not the browser**
   - One price list on the server per generation type and model (image, Wan 2.5, Haiper, Veo 3.1, 3D, CAD), times the number of images/videos and length.
   - Credits are taken before the AI is called. No credits means a clear message: "Not enough credits — buy a credit pack" with a button.

3. **Every AI function checks payment first**
   - Image, video, 3D and edit functions refuse to start unless that job has been paid for. This closes the "generate for free" gap.

4. **Automatic refund when a generation fails**
   - If the AI provider errors out, the credits go back to the same place they came from (ad, free, or paid), and the history shows the refund.

5. **Clear balance in the top bar**
   - Shows paid credits, plus free/ad generations as a separate small label, e.g. "0 credits · 2 free". GM badge stays.

## Prices used
The current credit costs stay until you approve the new pricing proposal from earlier (image 2, Wan 22, Haiper 42, Veo 165, 3D/CAD 15). When you say "go" on that, only the server price list changes.

## Checks
- Small tests for the price list (e.g. Veo 3.1 for 2 videos costs exactly 2 × the Veo price) and the refund rule.
- Browser test with your account: balance shows 0, a video attempt is blocked with the "buy credits" message, an image uses a free generation and the balance updates.

## Technical details
- Data fix via run_sql on `token_balances` for the admin user: `balance=0, free_tokens_granted=5`.
- New `supabase/functions/_shared/pricing.ts` with `calculateCost({type, model, count, duration})`; `check-and-deduct-tokens` ignores client `estimatedTokens`, loads the job server-side and computes the cost (rejects amount ≤ 0, job not owned by caller).
- `generate-image`, `generate-video`, `generate-free-video`, `edit-image`, 3D/CAD functions: verify a `usage_logs` row exists for `job_id` before calling the provider.
- New SQL function `refund_tokens(_job_id)` (security definer, idempotent) that reverses the logged source; called by generation/polling functions on provider failure.
- `Navigation.tsx` shows `balance` with European formatting and free/ad remaining separately.
- `JobContext.tsx` stops sending a cost amount.
