# Scenes: generate missing shots, richer regenerate, continue video, full E2E

## 1. Real-world credits: owner pays from Replicate, users pay with app credits
Replicate has no way to create sub-accounts or wallets for your users, so one Replicate account per user isn't possible. What we will build instead:
- **Owner mode (GM only):** your generations skip app credits and run straight on your own Replicate balance (your $6,68), exactly as they would if you called Replicate yourself. Each one is recorded with its real Replicate cost.
- **Users:** keep paying with app credits. Behind the scenes every generation runs on your Replicate account, and we save the Replicate job ID, model, run time and real dollar cost.
- **Per-user logs, shown in the app:** a "Generation history" page for each user (model, status, credits used, date) and a GM page listing every user's real Replicate spend next to the credits they paid, so you can see your margin.
- **Replicate balance alert:** Replicate doesn't let apps read the balance, so you enter your top-up amount on the GM page. The app subtracts the real costs as they happen and warns you below $5, before generations start failing.

## 2. Generate the missing shots (Dragons fight)
- Shot 4 "Aerial Supremacy" and Shot 6 "A Tactical Retreat": switch them to video (Wan 2.5, 5 s) and generate from their descriptions.
- Shot 5 "The Unforeseen Counter": use its existing picture as the starting frame and animate it into a video.
- Check each finished video is saved permanently in our storage and plays on the Scenes page.
- If the provider fails (the earlier E002/Haiper 422 error), find the cause, fix it, and check that the credits come back.

## 3. Better "Regenerate" window
Clicking Regenerate opens a window with:
- the scene prompt, pre-filled and editable
- Characters (pick saved character references, or type a description)
- Animation / motion (e.g. slow pan, handheld, slow motion)
- Art style (e.g. cinematic, anime, 3D render, watercolor, or your own text)
- duration (5 / 10 s) and the cost in credits before you confirm
These are combined into the final prompt on the server. The price is still set on the server only.

## 4. New "Continue video" button (next to Regenerate)
- It shows on every scene that has a finished video. It asks for a second prompt (with the same character, motion and style fields).
- The server takes the last frame of the current video and generates a new clip starting from that frame, so the action carries on from the last second (sequential frame-to-frame extension).
- The result is a new scene placed right after the original and linked to it. It can be regenerated or continued again, building long chains that "Create video" stitches into one film.
- It costs the same as one video of that model and duration, and is refunded if it fails.

## 5. Automated E2E test of the Scenes page
A Playwright run signed in as the GM checks every button: project select, new project, save, delete, the tabs (All scenes, Ready, Playlists, AI script, Settings), add scene, generate image / generate all images, scene type and duration, output, download, export to gallery, import, delete scene, regenerate (new window, real generation) and continue video (real generation). Create video (stitching) is checked last. Any broken button gets fixed and the test is run again.

## Technical details
- `SceneRegenerator.tsx`: AlertDialog becomes a Dialog form. New `SceneContinueDialog.tsx`. Both go through a scenes service in `src/services`.
- `regenerate-scene` edge function: accepts `{ characters, motion, style, duration }` (validated with Zod) and builds the prompt on the server.
- New `continue-scene` edge function: `requireCharge`, extracts the last frame (ffmpeg via Replicate frame-extract model, or the provider's last-frame output), runs Wan 2.5 i2v with `start_image`, archives the MP4 to `generated-models`, and inserts a storyboard scene at `order_index + 1` (shifting later scenes).
- Schema: add nullable `parent_scene_id uuid` and `continuation_prompt text` to `storyboard_scenes` (additive).
- Unit tests for the prompt builder and order shifting; Playwright script kept under `e2e/scenes.spec`.
