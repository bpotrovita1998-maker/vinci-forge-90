# Scenes: generate missing shots, richer regenerate, continue video, full E2E

## 1. Pay for testing
- Give the GM account a one-off grant of 200 app credits, labelled "GM test grant". It is added once, through the same grant used for credit packs.
- Real cost is only the Replicate spend, roughly $1–2 for the whole test.

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
