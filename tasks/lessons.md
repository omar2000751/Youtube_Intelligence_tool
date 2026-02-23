# Lessons Learned

## Quality Filter: Hashtag Threshold Too Aggressive
**Date:** 2026-02-23
**Issue:** User saw only 10 videos after Refresh Data, expected 30-60+.
**Root cause:** `passesQualityFilters` in `youtube.ts` rejected any video with `>= 2` hashtags.
Quality educational creators routinely use 1-3 hashtags in titles (e.g. `#ChatGPT #Tutorial`).
Real hashtag spam uses 4+ tags (`#memes #ai #viral #grox #chatgpt`).
**Fix:** Raised threshold from `>= 2` → `>= 4`.
**Rule:** When video count is suspiciously low (~10 vs expected ~50), check filter stats logged
by `[YouTube filterStats]` in server logs FIRST before assuming a pipeline/DB issue.
The `filterStats` object breaks down exactly how many videos each gate rejected.

## Stale DB Data vs. Code Changes
**Date:** 2026-02-23
**Issue:** Code changes to display limits don't take effect until user clicks "Refresh Data"
because `related_video_ids` arrays stored in the `trends` table reflect the limits at the
time of the last fetch, not the current code.
**Rule:** When changing how many video IDs get stored per pillar, always tell the user they
need to trigger a Refresh Data for the new limits to apply.

## Two Copies of the Same Filter Logic
**Date:** 2026-02-23
**Issue:** The hashtag threshold appears in TWO places in `youtube.ts`:
  1. `passesQualityFilters()` function (lines ~80-109) — used for early filtering
  2. Inline in `fetchNicheVideos()` filter loop (lines ~359-370) — tracks per-rule stats
Both must be updated together or they silently diverge.
**Rule:** Always grep for the constant/threshold value before changing it to find all occurrences.
