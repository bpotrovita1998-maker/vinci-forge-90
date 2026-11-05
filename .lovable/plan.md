# AI model catalog, model picker, long-form movies and clean GM account

## 1. Clean up your account (first step)
- Cancel the test Creator subscription in Stripe test mode.
- Remove the 3.500 test credits and the test credit records, so your account goes back to 0 paid credits plus 5 free generations.
- Your account keeps GM powers but pays like a real user.

## 2. Model catalog managed by the GM
A new "AI models" admin page, visible only to you (GM role checked on the server).
- Add a model: pick a section (Image, Video, 3D, CAD), paste the Replicate model name (for example `black-forest-labs/flux-1.1-pro`). The page reads the model's details from Replicate (description, inputs, latest version) and fills the form.
- Set: display name, short description, credit price per generation (with a suggested price = Replicate cost + about 35% profit), tier (Free / paid plan), max duration and resolutions for video, on/off switch, sort order, "default" flag.
- Test button: runs one small generation so you can check the model works before turning it on.
- Disable instead of delete, so old jobs keep their history.

Starter models added on day one (all on Replicate, verified working before enabling):
- Image: Nano Banana (current), FLUX 1.1 Pro / FLUX Kontext, Ideogram v3, Recraft v3, Imagen 4, Seedream 4.
- Video: Wan 2.5 (current), Veo 3.1 (current), Kling 2.x, Hailuo / MiniMax, Seedance, Luma Ray. Haiper is removed (it fails today).
- 3D: Hunyuan3D 2.1 (current), TRELLIS, plus one newer image-to-3D model.
- CAD: Hunyuan3D-based pipeline (current) plus TRELLIS as an option.
Exact list is confirmed against Replicate during the build; any model that fails the test stays off.

## 3. Model picker for every user
- On Create, each section (Image, Video, 3D, CAD) gets "Advanced options" with a model dropdown showing name, short description and credit price.
- The price shown on the Generate button updates with the chosen model and count.
- Free users see paid-plan models with a lock and an upgrade prompt.
- The Pricing page price table is built from the same catalog, so it is always current.

## 4. Real credit charging per model
- Each model's price lives in the catalog in the database; the server looks it up from the model the user picked. The browser never sends a price.
- Video price scales with duration (price per 5 seconds).
- Same rules as today: charge before calling Replicate, refund automatically if nothing is delivered, no double charges.

## 5. Long AI movies (answer to your question, and a feature)
Long videos on Facebook are made exactly as you described: many short clips chained together (each new clip starts from the last frame of the previous one), plus a written script, AI voices and AI music, edited together. The app already has a basic version (multi-scene video + stitching). This plan upgrades it into a "Movie studio":
- Script: write or generate a script, split into scenes automatically.
- Scenes: each scene uses the chosen video model; "continue from last frame" keeps characters and places consistent (uses the existing character references).
- Voice-over: AI narration per scene (Lovable AI text-to-speech).
- Music: AI background music track (Lovable AI music, up to about 3 minutes, looped for longer films).
- Assemble: stitch all scenes, voice and music into one MP4.
- Price shown upfront = sum of all scenes + voice + music; charged scene by scene so a failed scene is refunded, not the whole movie.
- Realistic limit at launch: up to 10 minutes per movie (about 60-120 clips); longer is possible later but slow and expensive.

## 6. Automated end-to-end tests
Playwright tests, kept in the project and run at the end:
- GM adds a model, tests it, enables it; a normal user cannot open the admin page.
- Normal user sees the model in each section's dropdown with the right price.
- Generate one image with two different models: correct credits charged each time.
- Video, 3D and CAD generation with a chosen model: correct charge, refund on forced failure.
- Free user cannot use a locked model.
- Pricing page table matches the catalog.
- Movie studio: 2-scene short movie with voice and music, correct total charge, final MP4 plays.
- Existing pricing / checkout test still passes.
Plus unit tests for the price rules (model price, duration scaling, movie total).

## Technical details
- New table `ai_models` (section, replicate_slug, version, display_name, description, credit_price, price_unit, tier, input_schema jsonb, defaults jsonb, enabled, is_default, sort_order). RLS: everyone reads enabled rows; only `has_role(admin)` writes. Grants per public-schema rules.
- New edge function `admin-models` (GM-only: Replicate lookup via `GET /v1/models/{owner}/{name}`, create/update, test run).
- `_shared/pricing.ts` becomes the resolver: `calculateCost` loads the model row server-side; hardcoded prices stay only as fallback for the current models. AGENTS.md rule on prices updated accordingly.
- `generate-image`, `edit-image`, `generate-video`, `process-video-queue`, `poll-video-status`, `regenerate-scene`, `generate-3d`, `generate-cad` take a `modelId`, build Replicate input from the model's defaults + mapped user inputs, keep `requireCharge`/`withRefundOnFailure`.
- Movie studio extends `create-movie`, `generate-script`, `stitch-videos`; adds TTS and Lyria music calls through the Lovable AI gateway, stored in private storage.
- Client: `src/services/models-service.ts` (React Query), `ModelPicker` component (shadcn Select) per section, `/admin/models` page.
