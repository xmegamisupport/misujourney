-- ═══════════════════════════════════════════════════════════════════════════
-- 🏆 Journey Leaderboard — community ranking by Journey Points.
--
-- The customer explicitly chose to make names + points PUBLIC to the community.
-- This RPC therefore exposes, for every customer, ONLY: display name, avatar
-- emoji, and point totals + rank. It deliberately never returns user ids,
-- emails, phone numbers, weight, or any other profile field — the public
-- projection is name + avatar + points, nothing more. `isMe` lets the client
-- highlight the caller's own row without leaking anyone else's identity key.
--
-- Two boards: all-time total, and "this week" (ISO week, resets Monday).
-- Scoped to role='customer'. SECURITY DEFINER so it can read across users for
-- the ranking while the underlying tables stay locked down by RLS.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.get_journey_leaderboard(p_limit int default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select
      e.customer_id,
      sum(e.points)::int as total,
      coalesce(sum(e.points) filter (
        where e.earned_on >= date_trunc('week', current_date)::date
      ), 0)::int as weekly
    from public.journey_point_events e
    join public.profiles p on p.id = e.customer_id and p.role = 'customer'
    group by e.customer_id
  ),
  ranked as (
    select
      t.customer_id,
      nullif(trim(coalesce(p.name, '')), '') as name,
      p.avatar,
      t.total,
      t.weekly,
      rank() over (order by t.total desc) as total_rank,
      rank() over (order by t.weekly desc) as weekly_rank
    from totals t
    join public.profiles p on p.id = t.customer_id
  )
  select jsonb_build_object(
    -- The caller's own standing (always present if they have any points).
    'me', (
      select jsonb_build_object(
        'name', coalesce(r.name, '你'),
        'avatar', r.avatar,
        'total', r.total,
        'weekly', r.weekly,
        'totalRank', r.total_rank,
        'weeklyRank', r.weekly_rank
      )
      from ranked r
      where r.customer_id = auth.uid()
    ),
    -- All-time board, top N by total points.
    'topTotal', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', x.total_rank,
        'name', coalesce(x.name, '匿名旅人'),
        'avatar', coalesce(x.avatar, '🙂'),
        'points', x.total,
        'isMe', x.customer_id = auth.uid()
      ) order by x.total_rank, x.name nulls last)
      from (
        select * from ranked where total > 0
        order by total_rank, name nulls last
        limit p_limit
      ) x
    ), '[]'::jsonb),
    -- This-week board, top N by points earned since Monday.
    'topWeekly', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', x.weekly_rank,
        'name', coalesce(x.name, '匿名旅人'),
        'avatar', coalesce(x.avatar, '🙂'),
        'points', x.weekly,
        'isMe', x.customer_id = auth.uid()
      ) order by x.weekly_rank, x.name nulls last)
      from (
        select * from ranked where weekly > 0
        order by weekly_rank, name nulls last
        limit p_limit
      ) x
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.get_journey_leaderboard(int) from public, anon;
grant execute on function public.get_journey_leaderboard(int) to authenticated;
