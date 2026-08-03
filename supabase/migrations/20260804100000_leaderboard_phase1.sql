-- ═══════════════════════════════════════════════════════════════════════════
-- 🏆 Leaderboard — Phase 1 foundation.
--
-- Community motivation (NOT personal history). Four boards, but the ARCHITECTURE
-- is what matters: rules live in a settings table (not hardcoded), and one
-- dispatch RPC serves every ranking type. Adding a future board (monthly,
-- habit, coach-team, special event…) = a new `case` here + a registry entry on
-- the client — never a page rewrite.
--
-- Boards (Phase 1):
--   weekly_journey : most Journey Points THIS week — everyone competes.
--   weekly_growth  : (this week − last week) — "breakthrough"; only users
--                    registered > weekly_growth_min_registration_days, positive only.
--   rising_star    : users registered ≤ rising_star_max_registration_days,
--                    ranked by points earned.
--   (weekly_challenge is participation-shaped, served by its own RPC below.)
--
-- Privacy: the RPCs expose ONLY display name + avatar + the ranking value.
-- Never id / email / phone / weight. Scoped to role='customer'.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Configurable rules (change a value, not code) ───────────────────────────
create table if not exists public.leaderboard_settings (
  key text primary key,
  value jsonb not null,
  label text,
  updated_at timestamptz not null default now()
);
alter table public.leaderboard_settings enable row level security;
-- No direct client access — read only through the SECURITY DEFINER RPCs below.

insert into public.leaderboard_settings (key, value, label) values
  ('week_start_dow',                    to_jsonb(1),  '每周从周几开始 (ISO: 1=周一 … 7=周日)'),
  ('weekly_growth_min_registration_days', to_jsonb(14), '成长榜：注册满 X 天才可参与'),
  ('rising_star_max_registration_days',   to_jsonb(30), '新星榜：注册 X 天内可参与'),
  ('leaderboard_limit',                 to_jsonb(50), '榜单默认显示人数')
on conflict (key) do nothing;

-- ── Weekly Challenge definition (real config, changeable each week) ──────────
create table if not exists public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,               -- the week this challenge belongs to
  icon text not null default '🎯',
  title text not null,
  description text not null,
  goal_type text not null,                       -- e.g. water_streak · early_checkin · learning_daily · balanced_meals
  goal_params jsonb not null default '{}'::jsonb, -- e.g. { "days": 7 }
  created_at timestamptz not null default now()
);
alter table public.weekly_challenges enable row level security;

-- Who completed the current challenge (Phase 1: mocked; later wired to signals).
create table if not exists public.weekly_challenge_completions (
  challenge_id uuid not null references public.weekly_challenges(id) on delete cascade,
  customer_id  uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (challenge_id, customer_id)
);
alter table public.weekly_challenge_completions enable row level security;

-- ── The one dispatch RPC for every ranking board ────────────────────────────
create or replace function public.get_leaderboard(p_type text, p_limit int default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
    select
      (select (value #>> '{}')::int from public.leaderboard_settings where key = 'week_start_dow') as dow,
      (select (value #>> '{}')::int from public.leaderboard_settings where key = 'weekly_growth_min_registration_days') as growth_min_days,
      (select (value #>> '{}')::int from public.leaderboard_settings where key = 'rising_star_max_registration_days') as star_max_days,
      coalesce(p_limit, (select (value #>> '{}')::int from public.leaderboard_settings where key = 'leaderboard_limit'), 50) as lim
  ),
  win as (
    select (current_date - (((extract(isodow from current_date)::int - (select dow from cfg)) + 7) % 7))::date as ws
  ),
  weeks as (select ws, (ws + 7) as we, (ws - 7) as lws, ws as lwe from win),
  base as (
    select
      p.id as customer_id, p.name, p.avatar, p.created_at,
      coalesce(sum(e.points) filter (where e.earned_on >= w.ws  and e.earned_on < w.we),  0)::int as this_week,
      coalesce(sum(e.points) filter (where e.earned_on >= w.lws and e.earned_on < w.lwe), 0)::int as last_week,
      coalesce(sum(e.points), 0)::int as total
    from public.profiles p
    cross join weeks w
    left join public.journey_point_events e on e.customer_id = p.id
    where p.role = 'customer'
    group by p.id, p.name, p.avatar, p.created_at, w.ws, w.we, w.lws, w.lwe
  ),
  rows as (
    select
      b.customer_id, b.name, b.avatar,
      case p_type
        when 'weekly_journey' then b.this_week
        when 'weekly_growth'  then (b.this_week - b.last_week)
        when 'rising_star'    then b.total
      end as value,
      case p_type
        when 'weekly_journey' then true
        when 'weekly_growth'  then (now() - b.created_at) >= make_interval(days => (select growth_min_days from cfg))
        when 'rising_star'    then (now() - b.created_at) <= make_interval(days => (select star_max_days from cfg))
      end as eligible
    from base b
  ),
  ranked as (
    select customer_id, name, avatar, value, rank() over (order by value desc) as rnk
    from rows
    where eligible and value > 0
  )
  select jsonb_build_object(
    'me', (
      select jsonb_build_object('rank', rnk, 'value', value)
      from ranked where customer_id = auth.uid()
    ),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', x.rnk,
        'name', coalesce(nullif(trim(x.name), ''), '匿名旅人'),
        'avatar', coalesce(x.avatar, '🙂'),
        'value', x.value,
        'isMe', x.customer_id = auth.uid()
      ) order by x.rnk, x.name)
      from (select * from ranked order by rnk, name limit (select lim from cfg)) x
    ), '[]'::jsonb)
  );
$$;
revoke execute on function public.get_leaderboard(text, int) from public, anon;
grant execute on function public.get_leaderboard(text, int) to authenticated;

-- ── Weekly Challenge RPC (participation-shaped) ─────────────────────────────
create or replace function public.get_current_weekly_challenge()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
    select
      (select (value #>> '{}')::int from public.leaderboard_settings where key = 'week_start_dow') as dow,
      coalesce((select (value #>> '{}')::int from public.leaderboard_settings where key = 'leaderboard_limit'), 50) as lim
  ),
  win as (
    select (current_date - (((extract(isodow from current_date)::int - (select dow from cfg)) + 7) % 7))::date as ws
  ),
  ch as (select c.* from public.weekly_challenges c cross join win where c.week_start = win.ws limit 1),
  comps as (
    select cc.customer_id, p.name, p.avatar, cc.completed_at
    from public.weekly_challenge_completions cc
    join ch on ch.id = cc.challenge_id
    join public.profiles p on p.id = cc.customer_id
  )
  select case when not exists (select 1 from ch) then jsonb_build_object('challenge', null)
  else jsonb_build_object(
    'challenge', (select jsonb_build_object(
        'icon', icon, 'title', title, 'description', description,
        'goalType', goal_type, 'goalParams', goal_params) from ch),
    'participants', (
      select count(distinct e.customer_id)::int
      from public.journey_point_events e cross join win
      where e.earned_on >= win.ws and e.earned_on < win.ws + 7
    ),
    'completions', (select count(*)::int from comps),
    'meCompleted', exists (select 1 from comps where customer_id = auth.uid()),
    'completers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', coalesce(nullif(trim(x.name), ''), '匿名旅人'),
        'avatar', coalesce(x.avatar, '🙂'),
        'isMe', x.customer_id = auth.uid()
      ) order by x.completed_at)
      from (select * from comps order by completed_at limit (select lim from cfg)) x
    ), '[]'::jsonb)
  ) end;
$$;
revoke execute on function public.get_current_weekly_challenge() from public, anon;
grant execute on function public.get_current_weekly_challenge() to authenticated;

-- ── Seed the current week's demo challenge + mocked completions (Phase 1) ────
insert into public.weekly_challenges (week_start, icon, title, description, goal_type, goal_params)
select (current_date - (((extract(isodow from current_date)::int - 1) + 7) % 7))::date,
  '💧', '7 天喝饱水',
  '这一周,每天都达成你的饮水目标 —— 和大家一起,把「喝水」这件小事,坚持满 7 天。',
  'water_streak', to_jsonb(json_build_object('days', 7))
on conflict (week_start) do nothing;

-- Mock a few completers so the participation view has something to show.
insert into public.weekly_challenge_completions (challenge_id, customer_id)
select c.id, v.cid
from public.weekly_challenges c
join (values
  ('bbad30da-8b43-4925-a0ee-784d2d3fb64a'::uuid),
  ('8ed2b1b8-3598-4441-ab38-0733e4c2df00'::uuid),
  ('607165f9-536f-4ae8-9a51-2c093186b69d'::uuid)
) as v(cid) on true
where c.week_start = (current_date - (((extract(isodow from current_date)::int - 1) + 7) % 7))::date
on conflict do nothing;
