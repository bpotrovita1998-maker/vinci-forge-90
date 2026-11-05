# Meta-prompt: Pricing, subscriptions, storage and credits overhaul

Use the prompt below as the single instruction for the build. Approving this plan runs it.

---

## Role
You are a pricing architect and full-stack engineer for an AI generation platform (images, videos, 3D, CAD). Your goal is a pricing model that is profitable for the owner and fair to creators, implemented end to end in the app.

## Step 1 - Audit real costs (no guessing)
1. Read the current Pricing page, subscription plans, storage plans, credit packs, and their payment product prices.
2. Collect real unit costs per generation type from the code and provider pricing:
   - Images (AI gateway cost per image)
   - Videos: Wan 2.5 ($0.15), Haiper ($0.30), Veo 3.1 ($1.20) per clip
   - 3D / CAD generations
3. Collect platform running costs: Cloud database instance per hour, storage per GB/month, bandwidth, payment fees (about 2.9% + €0.30), ads offset for free users.
4. Produce a cost table: item, real cost, current price, current margin. Flag anything sold at a loss.

## Step 2 - Design the pricing model
Each paid subscription = **platform fee + included storage + included credits**.

- **Platform fee** covers maintenance: database, bandwidth, support, payment fees.
- **Included storage** matches existing storage tiers (Free 2 GB, 50 GB, 250 GB, 1 TB).
- **Included credits** are spent only on generations, at a fixed credit value per generation type.
- Final monthly price = platform fee + storage price + credit value. Example: a creator who wants €50 of generation credits on the Creator plan pays Creator fee + Creator storage + €50 of credits.
- Show the breakdown on each plan card (fee, storage, credits) so customers see what they pay for.
- Target margin: about 30-40% over real cost on credits, about 50% on storage, platform fee covers fixed costs at a realistic subscriber count. State the assumptions.
- Keep the yearly 20% discount, applied to fee and storage only (not to credit value) so it stays profitable.
- Free tier stays: images only, 24h expiry, 15s ad = 5 generations.

## Step 3 - Top-up credits
- After included credits run out, users can buy credit packs (for example €10, €25, €50, €100) with small bonus credits on larger packs.
- Top-up credits never expire while the subscription is active; included monthly credits reset each billing cycle.
- Spending order: ad tokens first, then included monthly credits, then top-up credits.
- When credits reach zero, block generation with a friendly "Buy more credits" prompt instead of an error.

## Step 4 - GM account behaves like a real user
- Remove the "unlimited credits" display for the GM/admin account.
- Show the real credit balance, and deduct credits on every generation like any user.
- Keep GM powers separate: admin pages, moderation, granting credits to self or others, overriding limits manually through an explicit admin action (logged).
- Admin role stays in the protected roles table, never in profile data.

## Step 5 - Implementation
- Create or update payment products and prices for every plan (monthly and yearly) and every credit pack.
- Update checkout, webhooks and subscription checks so a purchase sets the storage limit and adds included credits; renewal resets included credits; cancellation returns to Free 2 GB and keeps unused top-up credits.
- Store credit ledger entries (grant, spend, top-up, refund, admin adjustment) for auditability.
- Use European formatting (€49,99), DD/MM/YYYY dates, sentence case labels.

## Step 6 - Verify
- Unit tests: price breakdown per plan, credit cost per generation type, spending order, GM balance deduction, block at zero credits.
- Browser check: Pricing page breakdown, buy a plan and a credit pack in test mode, generate an image as GM and see the balance drop.
- Report the final price table with real cost, price and margin per item.

## Constraints
- Never sell any item below real cost.
- Do not change the free tier rules or the theme.
- Ask the owner to confirm the final price table before creating live payment prices.
