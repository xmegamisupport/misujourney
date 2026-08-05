-- Rank trend needs history. A tiny daily snapshot of each board's ranks; the RPC
-- compares today's rank to the most recent prior snapshot per user+board.
-- (A daily cron to populate snapshots is a Phase-2 follow-up; a demo "yesterday"
-- row is seeded below so trends render now.)
create table if not exists public.leaderboard_snapshots (
  board_type text not null,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  taken_on date not null,
  rank int not null,
  primary key (board_type, customer_id, taken_on)
);
alter table public.leaderboard_snapshots enable row level security;

-- get_leaderboard now also returns: per-row trend {dir,delta}, and in `me` the
-- gap to the Top-10 cutoff (for the "距离 Top10 还差 X pts" card).
create or replace function public.get_leaderboard(p_type text, p_limit int default null)
returns jsonb language sql stable security definer set search_path = ''
as $$
  with cfg as (
    select
      (select (value #>> '{}')::int from public.leaderboard_settings where key = 'week_start_dow') as dow,
      (select (value #>> '{}')::int from public.leaderboard_settings where key = 'weekly_growth_min_registration_days') as growth_min_days,
      (select (value #>> '{}')::int from public.leaderboard_settings where key = 'rising_star_max_registration_days') as star_max_days,
      coalesce(p_limit, (select (value #>> '{}')::int from public.leaderboard_settings where key = 'leaderboard_limit'), 50) as lim
  ),
  win as (select (current_date - (((extract(isodow from current_date)::int - (select dow from cfg)) + 7) % 7))::date as ws),
  weeks as (select ws, (ws + 7) as we, (ws - 7) as lws, ws as lwe from win),
  base as (
    select p.id as customer_id, p.name, p.avatar, p.created_at,
      coalesce(sum(e.points) filter (where e.earned_on >= w.ws  and e.earned_on < w.we),  0)::int as this_week,
      coalesce(sum(e.points) filter (where e.earned_on >= w.lws and e.earned_on < w.lwe), 0)::int as last_week,
      coalesce(sum(e.points), 0)::int as total
    from public.profiles p cross join weeks w
    left join public.journey_point_events e on e.customer_id = p.id
    where p.role = 'customer'
    group by p.id, p.name, p.avatar, p.created_at, w.ws, w.we, w.lws, w.lwe
  ),
  rows as (
    select b.customer_id, b.name, b.avatar,
      case p_type when 'weekly_journey' then b.this_week when 'weekly_growth' then (b.this_week - b.last_week) when 'rising_star' then b.total end as value,
      case p_type when 'weekly_journey' then true
                  when 'weekly_growth'  then (now() - b.created_at) >= make_interval(days => (select growth_min_days from cfg))
                  when 'rising_star'    then (now() - b.created_at) <= make_interval(days => (select star_max_days from cfg)) end as eligible
    from base b
  ),
  ranked as (select customer_id, name, avatar, value, rank() over (order by value desc) as rnk from rows where eligible and value > 0),
  prior as (
    select distinct on (customer_id) customer_id, rank as prev_rank
    from public.leaderboard_snapshots where board_type = p_type and taken_on < current_date
    order by customer_id, taken_on desc
  ),
  scored as (
    select r.*,
      case when pr.prev_rank is null then 'new'
           when pr.prev_rank > r.rnk then 'up'
           when pr.prev_rank < r.rnk then 'down'
           else 'same' end as dir,
      case when pr.prev_rank is null then 0 else abs(pr.prev_rank - r.rnk) end as delta
    from ranked r left join prior pr on pr.customer_id = r.customer_id
  ),
  top10 as (select min(value) as cutoff from (select value from scored order by rnk limit 10) t)
  select jsonb_build_object(
    'me', (select jsonb_build_object(
        'rank', rnk, 'value', value,
        'trend', jsonb_build_object('dir', dir, 'delta', delta),
        'toTop10', greatest(0, coalesce((select cutoff from top10), 0) - value))
      from scored where customer_id = auth.uid()),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', x.rnk, 'name', coalesce(nullif(trim(x.name), ''), '匿名旅人'),
        'avatar', coalesce(x.avatar, '🙂'), 'value', x.value, 'isMe', x.customer_id = auth.uid(),
        'trend', jsonb_build_object('dir', x.dir, 'delta', x.delta)) order by x.rnk, x.name)
      from (select * from scored order by rnk, name limit (select lim from cfg)) x
    ), '[]'::jsonb)
  );
$$;
revoke execute on function public.get_leaderboard(text, int) from public, anon;
grant execute on function public.get_leaderboard(text, int) to authenticated;

insert into public.leaderboard_snapshots (board_type, customer_id, taken_on, rank) values
  ('weekly_journey', 'bbad30da-8b43-4925-a0ee-784d2d3fb64a', current_date - 1, 1),
  ('weekly_journey', '8ed2b1b8-3598-4441-ab38-0733e4c2df00', current_date - 1, 2),
  ('weekly_journey', 'a2089222-894b-4676-af9e-c694bbb1823b', current_date - 1, 3)
on conflict do nothing;
