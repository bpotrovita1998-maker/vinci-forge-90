

# Re-render Countdown Spinner with Transparent Background

## Problem
The current video uses H264/MP4 codec which does not support alpha channels, resulting in a black background instead of transparent.

## Solution
Two changes to `remotion/scripts/render.mjs`:

1. **Change codec** from `"h264"` to `"vp8"` (WebM with alpha support)
2. **Change output file** from `.mp4` to `.webm`

No changes needed to `CountdownSpinner.tsx` — it already sets `backgroundColor: "transparent"`.

### File: `remotion/scripts/render.mjs`
- Line 30: `codec: "h264"` → `codec: "vp8"`
- Line 31: output path `.mp4` → `.webm`
- Line 38: update console log path

Then re-run the render script.

