-- ═══════════════════════════════════════════════════════════════════════════
-- Hidden Discovery — Phase 5: real-time Reveal Session + permanent Collection.
--
-- The customer-facing experience. Discoveries are invisible until unlocked;
-- once unlocked they wait in the celebration queue, are revealed on the next
-- dashboard visit, then live forever in the Collection. No rarity is ever
-- returned to the client. Retires nothing structurally — it just adds the read
-- and acknowledge paths the UI needs, all scoped to auth.uid().
-- ═══════════════════════════════════════════════════════════════════════════

-- ── What is waiting to be revealed (queue not yet acknowledged) ─────────────
-- Marks fetched rows 'displayed' so the Console can see they surfaced. Order is
-- the celebration priority the engine already computed (rarity is NEVER exposed;
-- it only influenced this internal ordering).
create or replace function public.get_ready_reveals()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  v_ret jsonb;
begin
  if u is null then return '[]'::jsonb; end if;

  update public.discovery_celebration_queue q
    set status = 'displayed', displayed_at = coalesce(displayed_at, now())
    where q.user_id = u and q.status in ('pending', 'ready');

  select coalesce(jsonb_agg(jsonb_build_object(
      'queueId', q.id,
      'code', a.code,
      'name', a.name,
      'icon', a.icon,
      'message', a.description,
      'category', a.category
    ) order by q.priority desc, q.queued_at asc), '[]'::jsonb)
  into v_ret
  from public.discovery_celebration_queue q
  join public.discovery_achievements a on a.id = q.achievement_id
  where q.user_id = u and q.status in ('displayed');

  return v_ret;
end;
$$;
revoke execute on function public.get_ready_reveals() from public, anon;
grant execute on function public.get_ready_reveals() to authenticated;

-- ── Finish a Reveal Session: everything shown becomes part of the Collection ─
create or replace function public.acknowledge_discovery_reveals(p_queue_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  v_count int;
begin
  if u is null or p_queue_ids is null or array_length(p_queue_ids, 1) is null then return 0; end if;

  -- Reveal date on the unlock itself = when the user was actually shown it.
  update public.user_discoveries ud
    set revealed_at = now()
    where ud.user_id = u and ud.revealed_at is null
      and ud.achievement_id in (
        select q.achievement_id from public.discovery_celebration_queue q
        where q.user_id = u and q.id = any(p_queue_ids)
      );

  update public.discovery_celebration_queue q
    set status = 'acknowledged', acknowledged_at = now()
    where q.user_id = u and q.id = any(p_queue_ids) and q.status <> 'acknowledged';
  get diagnostics v_count = row_count;

  return v_count;
end;
$$;
revoke execute on function public.acknowledge_discovery_reveals(uuid[]) from public, anon;
grant execute on function public.acknowledge_discovery_reveals(uuid[]) to authenticated;

-- ── The permanent Collection: discovered moments only (name · message · date) ─
create or replace function public.get_my_discovery_collection()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'code', a.code,
      'name', a.name,
      'icon', a.icon,
      'message', a.description,
      'category', a.category,
      'discoveredAt', ud.revealed_at
    ) order by ud.revealed_at desc), '[]'::jsonb)
  from public.user_discoveries ud
  join public.discovery_achievements a on a.id = ud.achievement_id
  where ud.user_id = auth.uid() and ud.revealed_at is not null;
$$;
revoke execute on function public.get_my_discovery_collection() from public, anon;
grant execute on function public.get_my_discovery_collection() to authenticated;

-- ── Recognition copy for the live discoveries (Principle 4: celebrate the ────
-- person, not the action). The other 18 stay as-is until they are enabled.
update public.discovery_achievements set description =
  '你主动迎接了这一天，而不是被它推着走。这份从容，很多人渴望，却难得。'
  where code = 'today-ahead';
update public.discovery_achievements set description =
  '当世界还在沉睡，你已经开始善待自己。早起的人，拥有别人错过的宁静。'
  where code = 'early-bird';
update public.discovery_achievements set description =
  '好好喝水，你把它坚持成了不间断的习惯。这份稳定，是很多人做不到的温柔。'
  where code = 'watertight';
update public.discovery_achievements set description =
  '你一次次选择善待自己的身体，久而久之，温柔成了本能。'
  where code = 'hundredth-cup';
update public.discovery_achievements set description =
  '无数个清晨，你都愿意诚实地面对自己。这份坦诚与勇气，本身就了不起。'
  where code = 'hundred-mornings';
