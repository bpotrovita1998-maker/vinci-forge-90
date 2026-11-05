# Roadmap

- [x] Backend awake (Mini instance), video background tasks read less data, jobs index added
- [x] Storage plans: limits per user, usage bar, Stripe checkout, full-storage block on generations
- [x] Image generation tested end to end
- [x] Real credits: GM account reset to 0 paid credits, server decides prices, every AI service checks payment, refunds on provider failure, top bar shows real balance
- [ ] Video generation: the video provider failed the test clip (default model error E002, Haiper model rejected settings). Blocked: needs a decision before spending more on retries
- [x] New pricing live: Creator/Studio/Business plans with storage + monthly credits, 4 credit packs, new generation prices, plan detection, working Manage subscription, e2e test
- [x] Scene redos charged at the video model's price, refunded if the redo can't start
- [ ] Yearly billing (20% off fee + storage). Not built yet: waiting for the user to confirm they still want it
