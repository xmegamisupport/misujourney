-- ═══════════════════════════════════════════════════════════════════════════
-- Hidden Discovery — Phase 3.5: fully generalize unlock scope (no future
-- redesign). A single `dedup_key` derived from the discovery's unlock_scope is
-- the uniqueness arbiter, so all four scopes work today:
--   lifetime    → key ''                     (once ever)
--   per_journey → key 'j:'||journey_id        (once per journey)
--   per_stage   → key 's:'||stage             (once per stage)
--   repeatable  → key 'r:'||uuid (always new)  (never dedups — many allowed)
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.user_discoveries
  add column if not exists dedup_key text not null default '';

-- Replace the scope index with the dedup-key index (0 real rows; safe).
drop index if exists public.ux_user_discoveries_scope;
create unique index if not exists ux_user_discoveries_dedup
  on public.user_discoveries (user_id, achievement_id, dedup_key);

-- Record RPC now derives dedup_key from each discovery's unlock_scope.
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
  resolved as (
    select a.id as achievement_id, a.unlock_scope, i.source_event, i.journey_id,
           i.stage, i.evidence, i.registry_version,
           case a.unlock_scope
             when 'per_journey' then 'j:' || coalesce(i.journey_id::text, '')
             when 'per_stage'   then 's:' || coalesce(i.stage::text, '')
             when 'repeatable'  then 'r:' || gen_random_uuid()::text
             else ''
           end as dedup_key
    from incoming i
    join public.discovery_achievements a on a.code = i.code and a.enabled
  ),
  ins as (
    insert into public.user_discoveries
      (user_id, achievement_id, source_event, journey_id, stage, trigger_evidence, registry_version, dedup_key)
    select u, r.achievement_id, r.source_event, r.journey_id, r.stage, r.evidence, r.registry_version, r.dedup_key
    from resolved r
    on conflict do nothing
    returning id, achievement_id, unlocked_at, trigger_evidence
  ),
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
