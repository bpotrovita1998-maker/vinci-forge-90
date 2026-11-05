# Wake up the app, video storage costs, and selling storage

## Current state
- The backend is restarting after the move to the larger Mini size. It isn't accepting requests yet, so sign-in and generations fail until it finishes.
- Generated videos are already saved by the video generation tasks (generate-video, generate-free-video, create-movie, import-replicate-video).
- Payments already run on your own Stripe account (existing keys).

## Step 1 - Make the app fully working again
1. Wait until the backend reports healthy, then confirm that sign-in works for bpotrovita1998@gmail.com.
2. Fix the two video background tasks that overloaded the database: load only the fields they need, add the matching index, and run the checks less often.
3. Test one image generation and one video generation from start to finish: create the job, save the file, and see it in the gallery.
4. Run the security scan again and check the error logs.

## Step 2 - What storing videos costs
- I'll measure what one generated video really takes up (size per 5s and 10s clip at 720p and 1080p) and what your storage costs so far, using your workspace usage data.
- I won't quote storage prices for Lovable Cloud from memory. The report will use your actual billed rates.
- Rough sizes: a 10s 1080p clip is about 5 to 15 MB, so 1,000 videos are roughly 5 to 15 GB.
- The report will compare 3 options:
  - **Lovable Cloud storage**, which you use now and is the simplest.
  - **Cloudflare R2**, at about $0.015 per GB per month with no download fees. This is good when clips get watched a lot.
  - **Backblaze B2**, at about $6 per TB per month. This is cheapest for long-term archives.
- These provider prices are approximate public rates. I'll check them again before you decide.

## Step 3 - Connect an outside storage provider
- Add one storage provider (Cloudflare R2 is suggested) behind the current storage layer. New videos would go there, and files already stored stay where they are.
- An optional "Bring your own bucket" option: a business customer such as the casino could connect its own storage, so it holds its data and pays for it directly. This suits big clients.
- This needs an R2 account and access keys from you, stored securely.

## Step 4 - Sell storage in the app (yes, this is possible)
- Storage plans as Stripe add-ons, for example 50 GB, 250 GB and 1 TB per month, plus an Enterprise plan for the casino.
- Each user gets a storage limit. A usage bar shows in the gallery and settings, and uploads or generations are blocked with an upgrade prompt when the limit is reached.
- Retention rules: free files expire after 24h as today, and paid files are kept while the plan is active.
- Your margin is the plan price minus the storage cost from Step 2. The report will show the break-even point for each plan.

## Notes for the casino customer
- Selling them video generation as a business tool is fine. Video model providers and Stripe have rules about gambling content and ads, so prompts that promote gambling could be refused by the model. The app would show that refusal clearly; it won't retry.
- Video costs today: Wan 2.5 at $0.15, Haiper at $0.30, and Veo 3.1 at $1.20 per clip. Price the casino's plan above these costs.

## Questions before I start building
- Which outside provider do you want: Cloudflare R2, Backblaze B2, or Lovable Cloud only?
- What storage plan sizes and prices do you want? You can tell me after you see the cost report.
- Should the casino bring its own storage, or use yours?

## Technical details
- Add a field for storage used per user, with a limit enforced on the server in the save step of every generation task.
- Create a storage provider interface in the service layer. The R2 version uses its standard upload API, with signed links for viewing files.
- Use new Stripe prices for the storage add-ons. The webhook updates each user's storage limit.
- Add tests for the limit check and for the plan-to-limit mapping.
