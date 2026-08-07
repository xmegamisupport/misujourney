-- ═══════════════════════════════════════════════════════════════════════════
-- Food Library · Phase 3.3 (B) — Smart Image Retention
--
-- food_recognition_images + a private bucket + selection/cleanup RPCs. SQL only
-- DECIDES which images to keep (keep_score); the actual S3 file deletion runs in
-- the app layer via the Storage API (a SQL delete of storage.objects would orphan
-- the file and free no storage). Additive; recognition never depends on this.
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('food-inbox-images', 'food-inbox-images', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Food staff may view inbox images (uploads/deletes go through the service role).
create policy "food_inbox_images_select_staff" on storage.objects
  for select using (bucket_id = 'food-inbox-images' and public.food_can_edit());

create table if not exists public.food_recognition_images (
  id                uuid primary key default gen_random_uuid(),
  miss_id           uuid references public.food_match_misses(id) on delete cascade,
  food_id           uuid references public.foods(id) on delete cascade,
  storage_path      text not null unique,
  confidence        numeric,
  quality_score     numeric,                    -- 0..1 proxy (image bytes), richer signal later
  keep_score        numeric not null default 0, -- higher = more worth keeping
  is_representative boolean not null default true,
  pending_delete    boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists idx_rec_images_miss on public.food_recognition_images (miss_id);
create index if not exists idx_rec_images_food on public.food_recognition_images (food_id);
create index if not exists idx_rec_images_pending on public.food_recognition_images (pending_delete) where pending_delete;

alter table public.food_recognition_images enable row level security;
create policy food_rec_images_select_staff on public.food_recognition_images for select to authenticated using (public.food_can_edit());

-- Diversity-aware keep score: clearer photos + uncertain recognitions score higher.
create or replace function public.food_image_keep_score(p_quality numeric, p_confidence numeric)
returns numeric language sql immutable set search_path = '' as $$
  select round((2 * coalesce(p_quality, 0.5) + (1 - coalesce(p_confidence, 0.5)))::numeric, 4);
$$;

-- Register a captured image for a miss, then enforce the pre-publish cap.
-- Returns the storage paths that are now over-cap (for the app to remove).
create or replace function public.food_register_recognition_image(
  p_miss_id uuid, p_food_id uuid, p_path text, p_confidence numeric, p_quality numeric
)
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_limit integer;
begin
  select representative_image_limit into v_limit from public.food_library_settings where id;
  v_limit := coalesce(v_limit, 10);

  insert into public.food_recognition_images (miss_id, food_id, storage_path, confidence, quality_score, keep_score)
    values (p_miss_id, p_food_id, p_path, p_confidence, p_quality, public.food_image_keep_score(p_quality, p_confidence))
  on conflict (storage_path) do nothing;

  with ranked as (
    select id, row_number() over (order by keep_score desc, created_at desc) rn
    from public.food_recognition_images where miss_id = p_miss_id and not pending_delete
  )
  update public.food_recognition_images i
     set is_representative = (r.rn <= v_limit), pending_delete = (r.rn > v_limit)
    from ranked r where i.id = r.id;

  return coalesce(array(select storage_path from public.food_recognition_images where miss_id = p_miss_id and pending_delete), '{}');
end;
$$;

-- App confirms the files were removed from Storage → drop the metadata rows.
create or replace function public.food_confirm_image_deleted(p_paths text[])
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  delete from public.food_recognition_images where storage_path = any(p_paths);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Stage 4/5 cleanup for a published food: reduce to verified_image_limit, or to
-- a floor of 2 when the food is stale (no recognition in cleanup_inactive_days)
-- and consistently high-confidence. Marks over-cap rows; returns their paths.
create or replace function public.food_cleanup_food_images(p_food_id uuid)
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_limit integer; v_inactive integer; v_thresh numeric; v_last date; v_avg numeric;
begin
  select verified_image_limit, cleanup_inactive_days, high_confidence_threshold
    into v_limit, v_inactive, v_thresh from public.food_library_settings where id;
  v_limit := coalesce(v_limit, 5);

  select max(d.day),
         case when sum(d.confidence_n) > 0 then sum(d.confidence_sum) / sum(d.confidence_n) else null end
    into v_last, v_avg
    from public.food_recognition_daily d
   where d.food_id = p_food_id
      or d.miss_norm in (select normalized_key from public.food_aliases where food_id = p_food_id);

  if v_last is not null and v_last < current_date - coalesce(v_inactive, 90)
     and coalesce(v_avg, 0) >= coalesce(v_thresh, 0.9) then
    v_limit := least(v_limit, 2);  -- Stage 5: stale + high-confidence → keep only 2
  end if;

  with grp as (
    select ri.id, row_number() over (order by ri.keep_score desc, ri.created_at desc) rn
    from public.food_recognition_images ri
    join public.food_match_misses m on m.id = ri.miss_id
    where m.resolved_food_id = p_food_id and not ri.pending_delete
  )
  update public.food_recognition_images i
     set is_representative = (g.rn <= v_limit), pending_delete = (g.rn > v_limit)
    from grp g where i.id = g.id;

  return coalesce(array(
    select ri.storage_path from public.food_recognition_images ri
    join public.food_match_misses m on m.id = ri.miss_id
    where m.resolved_food_id = p_food_id and ri.pending_delete), '{}');
end;
$$;

-- UI reader: representative image paths for an inbox item (never every photo).
create or replace function public.food_inbox_representative_images(p_miss_id uuid)
returns setof text language sql security definer set search_path = '' as $$
  select storage_path from public.food_recognition_images
   where miss_id = p_miss_id and is_representative and not pending_delete
   order by keep_score desc, created_at desc;
$$;

revoke execute on function
  public.food_register_recognition_image(uuid, uuid, text, numeric, numeric),
  public.food_confirm_image_deleted(text[]),
  public.food_cleanup_food_images(uuid)
from anon;
