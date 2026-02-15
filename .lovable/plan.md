

# Scenes Page - Bug Fixes and Improvements

## Issues Found

### 1. `updateScene` fires DB writes on every keystroke (HIGH)
When typing in the title or description fields, `updateScene` is called on every character change (lines 2310, 2350). This function immediately writes to the database (line 794), causing:
- Excessive API calls (one per keystroke)
- Failed updates for newly added scenes that haven't been saved to DB yet
- Potential race conditions with overlapping writes

**Fix:** Debounce the `updateScene` DB write. Update local state immediately but batch the DB call with a 500ms debounce. For new scenes not yet in the DB, skip the DB write entirely.

### 2. `deleteScene` doesn't remove from database (HIGH)
The `deleteScene` function (line 817) only removes the scene from local state. The actual DB deletion only happens when the user manually clicks "Save." If the user deletes a scene and navigates away without saving, the scene reappears on next load.

**Fix:** Add an immediate DB delete call in `deleteScene` for scenes that have valid UUIDs in the database.

### 3. Playlists are lost on page refresh (MEDIUM)
The `stitchedPlaylists` state (line 122) is only held in memory. When the user refreshes the page, all created playlists disappear. They should be persisted to the database.

**Fix:** Store playlists in the `long_videos` table (which already exists) and load them when the storyboard loads.

### 4. Multiple overlapping job sync mechanisms cause conflicts (MEDIUM)
There are three separate systems monitoring job status:
- Polling sync effect (line 162) - runs every 5 seconds
- Realtime subscription (line 412) - listens for postgres changes
- Job context fallback (line 514) - monitors the JobContext

All three can fire simultaneously, causing duplicate toast notifications and redundant DB writes. The realtime subscription also re-subscribes every time `scenes` changes (it's in the dependency array at line 511), creating and destroying channels rapidly.

**Fix:** 
- Remove the job context fallback (it's redundant)
- Stabilize the realtime subscription by using a ref for scenes instead of putting it in the dependency array
- Add a guard to prevent duplicate "scene ready" toasts

### 5. Infinite re-render risk in sync effect (MEDIUM)
The sync effect at line 162 has `scenes` in its dependency array and calls `loadScenes` which calls `setScenes`, potentially creating a loop. Currently mitigated by the `hasUpdates` check, but it's fragile.

**Fix:** Remove `scenes` from the dependency array of the sync effect and use a ref to access the current scenes value.

### 6. Settings tab content missing from visible code (LOW)
The Settings tab is defined in the TabsList but I need to verify it renders properly.

### 7. Duration selector missing for video scenes (LOW)  
Video scenes support 5 or 10 second durations (Wan 2.5), but there's no UI control visible for users to choose between them. The default is always 5 seconds.

**Fix:** Add a duration selector (5s / 10s toggle) visible when scene type is "video."

---

## Technical Implementation Plan

### Step 1: Fix `updateScene` with debounced DB writes
- Split `updateScene` into two parts: immediate local state update + debounced DB persist
- Use a ref-based debounce map keyed by scene ID
- Skip DB writes for scenes that don't exist in the database yet (check via a `savedSceneIds` Set)

### Step 2: Fix `deleteScene` to delete from DB
- Add `supabase.from('storyboard_scenes').delete().eq('id', id)` call
- Only call DB delete if the scene ID exists in the database (is a valid saved UUID)

### Step 3: Persist playlists to `long_videos` table
- When a playlist is created, save it to `long_videos` with the manifest URL
- Load playlists from `long_videos` when the storyboard loads
- Add delete functionality that also removes from DB

### Step 4: Fix overlapping job sync
- Remove the job context fallback effect (lines 514-535)
- Move scenes reference to a ref for the realtime subscription to avoid re-subscribing constantly
- Add a `processedJobIds` Set ref to prevent duplicate notifications

### Step 5: Add video duration selector
- Add a simple 5s/10s toggle button group below the type selector when type is "video"

### Step 6: Stabilize sync effect
- Replace `scenes` in the dependency array with a ref
- Use `currentStoryboard?.id` as the primary trigger

