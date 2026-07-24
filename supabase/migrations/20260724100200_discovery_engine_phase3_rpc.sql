-- ═══════════════════════════════════════════════════════════════════════════
-- Hidden Discovery — Phase 3: unlock + celebration-queue RPC, and retiring the
-- auto-unlock-on-load loop from the (kept) clue/reveal engine.
--
-- Unlocking is now EVENT-DRIVEN: the TS engine evaluates a specific event, then
-- calls record_hidden_discovery_unlocks() with the discoveries that just fired.
-- The scope-aware unique index is the idempotency arbiter, so a double-processed
-- event creates exactly one unlock and one queue row.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Idempotent unlock + queue write (all decisions & writes are DEFINER) ────
create or replace function public.record_hidden_discovery_unlocks(p_unlocks jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  v_ret jsonb;
begin
  if u is null or p_unlocks is null or jsonb_typeof(p_unlocks) <> 'array' then
    return '[]'::jsonb;
  end if;

  with incoming as (
    select x.code, x.source_event, x.journey_id, x.stage, x.evidence, x.registry_version
    from jsonb_to_recordset(p_unlocks) as x(
      code text, source_event text, journey_id uuid, stage integer,
      evidence jsonb, registry_version text
    )
  ),
  -- only enabled catalogue entries can ever unlock
  resolved as (
    select a.id as achievement_id, i.source_event, i.journey_id, i.stage,
           i.evidence, i.registry_version
    from incoming i
    join public.discovery_achievements a on a.code = i.code and a.enabled
  ),
  -- database-level idempotency: the scope-aware unique index is the arbiter
  ins as (
    insert into public.user_discoveries
      (user_id, achievement_id, source_event, journey_id, stage, trigger_evidence, registry_version)
    select u, r.achievement_id, r.source_event, r.journey_id, r.stage, r.evidence, r.registry_version
    from resolved r
    on conflict do nothing
    returning id, achievement_id, unlocked_at, trigger_evidence
  ),
  -- queue every NEW unlock; priority = rarity rank, then the discovery's own
  -- priority (lower number reveals earlier), then unlock time
  q as (
    insert into public.discovery_celebration_queue
      (user_id, discovery_unlock_id, achievement_id, priority)
    select u, ins.id, ins.achievement_id,
      (case a.rarity when 'legendary' then 4 when 'epic' then 3 when 'rare' then 2 else 1 end) * 100000
        - a.discovery_priority
    from ins join public.discovery_achievements a on a.id = ins.achievement_id
    on conflict (discovery_unlock_id) do nothing
    returning discovery_unlock_id, id as queue_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'discoveryId', a.code,
      'name', a.name,
      'description', a.description,
      'icon', a.icon,
      'rarity', a.rarity,
      'category', a.category,
      'celebrationType', a.celebration_type,
      'unlockedAt', ins.unlocked_at,
      'queueId', q.queue_id,
      'evidence', ins.trigger_evidence
    ) order by
      (case a.rarity when 'legendary' then 4 when 'epic' then 3 when 'rare' then 2 else 1 end) desc,
      a.discovery_priority asc,
      ins.unlocked_at asc
  ), '[]'::jsonb)
  into v_ret
  from ins
  join public.discovery_achievements a on a.id = ins.achievement_id
  left join q on q.discovery_unlock_id = ins.id;

  return v_ret;
end;
$$;

revoke execute on function public.record_hidden_discovery_unlocks(jsonb) from public, anon;
grant execute on function public.record_hidden_discovery_unlocks(jsonb) to authenticated;

-- ── Retire auto-unlock from the reveal engine; keep clues/hints/drip reveal ──
-- Unlocking moved to the event-driven engine above. This function now only:
-- tops up clues, evolves hints, computes progress, rotates a stale clue, and
-- reveals ONE already-unlocked discovery (fed by record_hidden_discovery_unlocks).
create or replace function public.evaluate_discoveries()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  v_tz text;
  water_dates date[]; weigh_dates date[]; dc_dates date[];
  water_count int; weigh_count int; dc_count int; learning_count int; n_used int; dx_used int;
  v_water_target int;
  v_clue_ct int; v_target int; v_pick uuid;
  v_signals text[]; v_last_progress date; v_stale int;
  v_fav_category text; v_max int; v_drop uuid; v_add uuid;
  v_gap numeric; v_last_reveal timestamptz; v_reveal_id uuid; v_ret jsonb := null;
begin
  if u is null then return null; end if;
  select coalesce(timezone, 'Asia/Kuala_Lumpur') into v_tz from public.profiles where id = u and role = 'customer';
  if v_tz is null then return null; end if;

  insert into public.discovery_engine_logs (user_id) values (u) on conflict do nothing;

  -- aggregates used for clue biasing / stale rotation only (NOT for unlocking)
  select water_target_ml into v_water_target from public.customer_goals where customer_id = u order by created_at desc limit 1;
  select array_agg(log_date) into water_dates from public.daily_water_logs where customer_id = u and v_water_target is not null and total_ml >= v_water_target;
  select array_agg(checkin_date) into weigh_dates from public.daily_checkins where customer_id = u and weight is not null;
  select array_agg(distinct earned_on) into dc_dates from public.journey_point_events where customer_id = u and action = 'daily_complete';
  select count(distinct day_number) into learning_count from public.cms_customer_content_progress where customer_id = u and completed_at is not null;
  select coalesce(sum(total_used_units), 0) into n_used from public.customer_inventory where customer_id = u and product_code = 'MISU_N_PLUS';
  select coalesce(sum(total_used_units), 0) into dx_used from public.customer_inventory where customer_id = u and product_code = 'MISU_DX_PLUS';
  water_count := coalesce(array_length(water_dates, 1), 0);
  weigh_count := coalesce(array_length(weigh_dates, 1), 0);
  dc_count := coalesce(array_length(dc_dates, 1), 0);

  -- keep the user topped up to the clue target
  v_target := coalesce((select value::int from public.discovery_settings where key = 'clue_target'), 6);
  select count(*) into v_clue_ct from public.user_discovery_clues where user_id = u;
  while v_clue_ct < v_target loop
    select id into v_pick from public.discovery_achievements a2
      where a2.enabled
        and a2.id not in (select achievement_id from public.user_discovery_clues where user_id = u)
        and a2.id not in (select achievement_id from public.user_discoveries where user_id = u)
      order by random() limit 1;
    exit when v_pick is null;
    insert into public.user_discovery_clues (user_id, achievement_id) values (u, v_pick);
    v_clue_ct := v_clue_ct + 1;
  end loop;

  -- evolve hint stages (per-achievement pacing)
  update public.user_discovery_clues c set current_stage = c.current_stage + 1, stage_advanced_at = now()
    from public.discovery_achievements a3
    where c.user_id = u and c.achievement_id = a3.id
      and now() - c.stage_advanced_at >= make_interval(days => a3.hint_advance_days)
      and c.current_stage < coalesce((select max(stage) from public.discovery_hints h where h.achievement_id = a3.id), 1);

  -- meaningful-progress date from the enabled signals
  select array_agg(key) into v_signals from public.discovery_progress_signals where enabled;
  select max(dt) into v_last_progress from (
    select unlocked_at::date dt from public.user_discoveries where user_id = u and 'discovery_unlock' = any(v_signals)
    union all
    select created_at::date from public.journey_point_events where customer_id = u and 'journey_reward' = any(v_signals)
    union all
    select earned_on from public.journey_point_events where customer_id = u and action = 'daily_complete' and 'daily_complete' = any(v_signals)
  ) s;
  update public.discovery_engine_logs set last_progress_date = v_last_progress, updated_at = now() where user_id = u;

  -- rotate ONE stale clue toward the user's recent behaviour
  v_stale := coalesce((select value::int from public.discovery_settings where key = 'stale_days'), 15);
  if v_last_progress is not null and (current_date - v_last_progress) >= v_stale then
    v_max := greatest(water_count, weigh_count, learning_count, n_used, dx_used, dc_count);
    v_fav_category := case when v_max = 0 then null
      when water_count = v_max then 'water'
      when dc_count = v_max then 'consistency'
      when weigh_count = v_max then 'morning'
      when learning_count = v_max then 'learning'
      when n_used = v_max then 'nutrition'
      when dx_used = v_max then 'detox' else null end;
    select achievement_id into v_drop from public.user_discovery_clues c
      where c.user_id = u and c.achievement_id not in (select achievement_id from public.user_discoveries where user_id = u)
      order by c.current_stage desc, c.assigned_at asc limit 1;
    if v_drop is not null then
      select id into v_add from public.discovery_achievements a4
        where a4.enabled and a4.id <> v_drop
          and a4.id not in (select achievement_id from public.user_discovery_clues where user_id = u)
          and a4.id not in (select achievement_id from public.user_discoveries where user_id = u)
        order by (case when v_fav_category is not null and a4.category = v_fav_category then 0 else 1 end), random() limit 1;
      if v_add is not null then
        delete from public.user_discovery_clues where user_id = u and achievement_id = v_drop;
        insert into public.user_discovery_clues (user_id, achievement_id) values (u, v_add);
        update public.discovery_engine_logs set clue_rotation_date = current_date where user_id = u;
      end if;
    end if;
  end if;

  -- reveal ONE discovery at a time, spaced out (drip). Unlocks are now created
  -- by the event engine; this only decides WHEN to surface them.
  v_gap := coalesce((select value::numeric from public.discovery_settings where key = 'reveal_gap_hours'), 6);
  select last_reveal_at into v_last_reveal from public.discovery_engine_logs where user_id = u;
  if v_last_reveal is null or (now() - v_last_reveal) >= make_interval(mins => (v_gap * 60)::int) then
    select ud.achievement_id into v_reveal_id from public.user_discoveries ud
      join public.discovery_achievements a5 on a5.id = ud.achievement_id
      where ud.user_id = u and ud.revealed_at is null
      order by a5.discovery_priority asc, ud.unlocked_at asc limit 1;
    if v_reveal_id is not null then
      update public.user_discoveries set revealed_at = now() where user_id = u and achievement_id = v_reveal_id;
      delete from public.user_discovery_clues where user_id = u and achievement_id = v_reveal_id;
      update public.discovery_engine_logs set last_reveal_at = now() where user_id = u;
      select jsonb_build_object('code', code, 'name', name, 'icon', icon, 'description', description, 'category', category, 'rarity', rarity)
        into v_ret from public.discovery_achievements where id = v_reveal_id;
    end if;
  end if;

  return v_ret;
end;
$$;

grant execute on function public.evaluate_discoveries() to authenticated;
