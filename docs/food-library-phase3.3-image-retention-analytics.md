# Food Library · Phase 3.3 — Smart Image Retention + Recognition Analytics

> Recognition Inbox is a **knowledge collection system, not an image gallery**.
> Recognition DATA is permanent; original photos are transient and capped.
> Additive; meal logging never depends on any of this.

## 1. Image lifecycle

| Stage | When | Behaviour |
|---|---|---|
| **1 · Collect** | Food first recognized, NOT yet published (a miss) | Keep the original photo as a review candidate |
| **2 · Cap** | Many users upload the same food | Keep at most `representative_image_limit` (default **10**) per food/miss — never every photo |
| **3 · Diversify** | Choosing which to keep | Not "first 10" — a **diversity score** prefers spread across confidence, recency and image quality (angle/lighting/plating tags are a future signal); reviewers see variety |
| **4 · Reduce** | Food becomes MISU Verified | Shrink to `verified_image_limit` (default **5**, range 2–5); delete the rest |
| **5 · Long-term cleanup** | Verified + consistently high confidence + no reviewer activity for `cleanup_inactive_days` | Archive/remove remaining images; keep metadata |

**Recognition DATA (never deleted, never depends on images):** dish name · AI
confidence · recognition type · components · estimated nutrition · suggested
aliases · first_seen_source · occurrence count · last seen.

## 2. Database changes
- `food_library_settings` — single-row config: `representative_image_limit`,
  `verified_image_limit`, `cleanup_inactive_days`, `high_confidence_threshold`.
  **No hardcoded limits anywhere.**
- `food_recognition_images` — one row per stored photo: `miss_id` / `food_id`,
  `storage_path`, `confidence`, `quality_score`, `keep_score`, `is_representative`,
  `pending_delete`, `created_at`.
- `food_recognition_daily` — analytics rollup: `(day, food_id | miss_norm)` →
  `hits`, `estimates`, `confidence_sum`, `confidence_n`. Bounded (one row per
  food per day), scales to tens of thousands of users.
- Storage bucket `food-inbox-images` (private; Food staff read, delete via app).

## 3. Storage strategy
- Only **misses** capture a photo (verified foods rarely need new ones). Each
  image row **owns its own file** (path `food-inbox/<miss>/<uuid>.jpg`) so
  pruning one never orphans another.
- The cap is enforced **on insert**: register → recompute the representative set
  → the over-cap, lowest-scoring images are marked `pending_delete` and their
  paths returned for the app layer to remove from Storage.

## 4. Cleanup strategy (why SQL alone can't free bytes)
Deleting `storage.objects` via SQL removes the index row but **leaves the S3
object** — no storage is freed. So:
- **SQL** decides *which* images to keep/prune (`food_prune_candidates`) — pure,
  testable, no side effects.
- **App layer** (analyze route on insert; a cleanup route/cron for Stage 4/5)
  reads the candidate paths, calls the Storage API `remove()` (frees the file),
  then `food_confirm_image_deleted()` drops the rows. Metadata is kept until the
  file is actually gone.

## 5. Representative-image selection logic
`keep_score` per image (higher = more worth keeping):
```
keep_score = 2·quality_score            (clearer photos help reviewers)
           + 1·(1 - confidence)         (uncertain recognitions need eyes)
           + recency_bonus              (newer presentations)
```
Keep the top `limit` by `keep_score`; ties broken by recency. `limit` =
`verified_image_limit` once the food is published, else `representative_image_limit`.
(Angle/lighting/plating diversity via perceptual hashing/embeddings is a future
upgrade — the schema already carries nullable tag fields for it.)

## 6. Configuration options
```
representative_image_limit = 10   -- pre-publish cap
verified_image_limit       = 5    -- post-publish cap (2–5)
cleanup_inactive_days      = 90   -- Stage-5 inactivity window
high_confidence_threshold  = 0.90 -- Stage-5 "consistently high"
```
All in `food_library_settings`; Food Admin editable; read by the RPCs.

## 7. Food Recognition Analytics (low cost, high value)
Per food/miss, from the daily rollup:
- **Total Recognitions** = hits + estimates
- **Verified Hit Rate** = hits / total
- **AI Estimate Count** = estimates
- **Average AI Confidence**
- **30-Day Trend** = last-30-day total

Estimates logged pre-publish (by `miss_norm`) auto-attribute to the food once
its alias is published, so a food shows its full history. Drives "what to review
next" from real usage — growth by data, not guesswork.

## 8. Backward compatibility
All additive. Recognition + meal logging never depend on images or analytics —
if the bucket, rollup, or cleanup is unavailable, the pipeline degrades silently
and logging still completes. Empty everything ⇒ today's behaviour.
