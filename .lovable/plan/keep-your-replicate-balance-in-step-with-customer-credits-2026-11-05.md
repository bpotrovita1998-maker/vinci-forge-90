# Keep your Replicate balance in step with customer credits

## How the money works (no change)
- Customers pay you through Stripe for plans and credit packs. Each account gets its own app credits.
- Each generation takes credits from that user and runs on your one Replicate balance. A failed generation gives the credits back.
- You top up Replicate from your Stripe income. The difference is your profit.

## Profit check with real Replicate prices (important)
These prices are from the Replicate model pages, read today. 1 app credit is worth about €0,01 (the €10 pack gives 1.000 credits). Prices assume $1 ≈ €0,93.

| Generation | Replicate cost | Credits now | Customer pays now | Result |
|---|---|---|---|---|
| Image (nano-banana) | $0,039 ≈ €0,036 | 2 | €0,02 | loss |
| Wan 2.5 video, 5 s, 720p | $0,50 ≈ €0,46 | 22 | €0,22 | loss |
| Wan 2.5 video, 5 s, 1080p | $0,75 ≈ €0,70 | 22 | €0,22 | loss |
| Veo 3.1, 8 s with sound | $3,20 ≈ €2,98 | 165 | €1,65 | loss |

Right now every generation costs you more than the customer pays.

**New credit prices** (Replicate cost × 1,6, which leaves about 35% profit after Stripe fees):
- Image: 6 credits
- Wan 2.5, 720p: 75 credits per 5 s (150 for 10 s)
- Wan 2.5, 1080p: 110 credits per 5 s (220 for 10 s)
- Veo 3.1 with sound: 480 credits per 8 s (240 without sound)
- Haiper, 3D and CAD: same rule, priced from each model's Replicate page during the build
- Scene redos and "Continue video" charge the same as a new clip of that length and quality

**Plans and packs keep their prices and credit amounts.** What a plan gives you, using the new prices:
- Creator €24,99 / 1.500 credits ≈ 20 Wan videos (720p, 5 s). Replicate cost ≈ €9,20 if all credits are used, leaving ≈ €14 after Stripe and storage.
- Studio €69,99 / 4.000 credits ≈ 53 videos. Cost ≈ €24,50, leaving ≈ €42.
- Business €199 / 11.000 credits ≈ 146 videos. Cost ≈ €67, leaving ≈ €125.
- Credit packs: the biggest pack (€100 / 11.000 credits) is the cheapest per credit, at €0,0091. It still leaves about 30% profit.
- The Pricing page shows how many videos and images each plan buys, so customers see what they get.

Storage and Stripe fees above are my estimates and need checking against real bills.

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
