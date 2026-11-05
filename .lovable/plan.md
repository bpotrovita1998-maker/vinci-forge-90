# Keep your Replicate balance in step with customer credits

## How the money works (no change)
- Customers pay you through Stripe for plans and credit packs. Each account gets its own app credits.
- Each generation takes credits from that user and runs on your one Replicate balance. A failed generation gives the credits back.
- You top up Replicate from your Stripe income. The difference is your profit.

## What to add
1. **Low-balance warning for you**
   - The GM history page already stores your Replicate balance. After each generation, the app subtracts its estimated cost.
   - When the estimate drops below a limit you choose (default $20), a red banner shows for you across the app, along with an email to your address.
2. **Protect customers when Replicate is empty**
   - If Replicate rejects a job because the balance is empty, the user gets their credits back. They see: "Video generation is paused for a few minutes, your credits were not used."
   - You get an urgent warning at the same moment.
3. **Your Replicate balance on your account**
   - Replicate has no way for other apps to read an account balance, and no Replicate sign-in for other apps. So the app can't show your $6,68 automatically.
   - You type in your real balance after each top-up. The app subtracts the cost of each generation from it and shows the result on your account badge, for you only.
   - Customers keep seeing their app credits, for example "1.500 credits" from a plan. They never need a Replicate account.
4. **Setup advice (done by you on Replicate)**
   - Turn on Replicate's automatic reload with a card, so the balance refills itself before it runs out.

## Testing
- Unit tests for the low-balance limit and the refund on an empty balance.
- An automated browser test that sets a low balance and checks the warning banner appears for the GM only.

## Technical details
- Check the limit in `recordProviderRun` (`_shared/billing.ts`). Add a `low_balance_threshold_usd` column to `provider_balance`.
- In `generate-video`, `generate-image`, `generate-3d` and `generate-cad`, treat provider 402 responses as a refund plus a `provider_balance_empty` error code.
- The email uses the existing app email setup, if one is configured. Otherwise the warning is shown in the app only.
