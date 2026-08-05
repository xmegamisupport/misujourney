-- Weekly Challenge is about COMPANIONSHIP, not statistics. Drop the head-count
-- shape (participants/completions/completers) in favour of: day progress + a
-- pool of OTHER travelers active in the community this week (name + avatar only).
-- The client shows a rotating 4–6 of them so it always feels like "someone is
-- keeping at it alongside me" — not a stats report.
create or replace function public.get_current_weekly_challenge()
returns jsonb language sql stable security definer set search_path = ''
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
  travelers as (
    select distinct p.id, p.name, p.avatar
    from public.journey_point_events e
    join public.profiles p on p.id = e.customer_id and p.role = 'customer'
    cross join win
    where e.earned_on >= win.ws and e.earned_on < win.ws + 7
      and p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
  select case when not exists (select 1 from ch) then jsonb_build_object('challenge', null)
  else jsonb_build_object(
    'challenge', (select jsonb_build_object(
        'icon', icon, 'title', title, 'description', description,
        'goalType', goal_type, 'goalParams', goal_params) from ch),
    'dayProgress', (select jsonb_build_object(
        'day', least(greatest((current_date - week_start)::int + 1, 1), coalesce((goal_params ->> 'days')::int, 7)),
        'total', coalesce((goal_params ->> 'days')::int, 7)) from ch),
    'meCompleted', exists (
      select 1 from public.weekly_challenge_completions cc join ch on ch.id = cc.challenge_id
      where cc.customer_id = auth.uid()
    ),
    'travelers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', coalesce(nullif(trim(t.name), ''), '旅人'),
        'avatar', coalesce(t.avatar, '🙂')))
      from (select * from travelers order by id limit (select lim from cfg)) t
    ), '[]'::jsonb)
  ) end;
$$;
revoke execute on function public.get_current_weekly_challenge() from public, anon;
grant execute on function public.get_current_weekly_challenge() to authenticated;
