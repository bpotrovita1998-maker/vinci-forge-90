# Finish the image move and remove all ads

## 1. Finish moving old image data into file storage
- Move the remaining 16 old saved generations that still hold full image data. Each one will keep only a link to its file.
- Check the result: no records with image data left, a smaller database, and gallery loads under 200 ms.
- Open the gallery in the browser and confirm the old images still show and download.
- No server upgrade. Mini stays.

## 2. Remove the ads system completely
- Remove the Google ads script and ad slots from every page: home, landing, blog, tutorials, FAQ and pricing.
- Remove the "Watch an ad for 5 generations" button, popup and counter, and the ad-blocker warning.
- Remove ad mentions from the cookie banner, privacy policy, onboarding and pricing copy.
- Switch off the server step that grants generations for watching ads.

**What free users get instead:** they keep the 5 free image generations they get at sign-up. When those run out, they're asked to choose a plan or buy credits. Any ad generations users already earned keep working until they're used up. Tell me if you'd rather give free users a monthly free refill instead.

## 3. Verify
- Automated browser check: no ad slots, no ad script and no "watch ad" button on any page.
- A free account can still generate images using its free generations, then sees the upgrade prompt.
- Existing tests pass, with tests updated for the removed ad credits.
- Re-check database health afterwards.

## Technical details
- Delete AdBanner, AdBlockDetector, RewardedAdModal, AdGenerationCounter and useAdGenerations, plus their imports in App, Index, Landing, Blog, Tutorials, Pricing, Hero and OnboardingWizard. Remove the adsbygoogle script and the ads.txt meta from index.html, and the ad wording in CookieConsent and PrivacyPolicy.
- Delete the grant-ad-generations edge function. Keep the ad_generations columns and the spend path in charge_generation so existing balances still drain, and comment the columns as DEPRECATED.
- Update credits-display(.test) to drop ad credits from the shown balance once they reach 0.
- Update memory: remove the ad and AdSense rules from Core and Memories, and change the free tier to "5 signup generations, no ad refill".
