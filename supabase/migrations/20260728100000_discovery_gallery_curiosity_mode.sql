-- ═══════════════════════════════════════════════════════════════════════════
-- Hidden Discovery — Curiosity Mode. The gallery returns ALL discovered, plus a
-- daily-rotating random handful (≤5) of undiscovered mysteries — never the full
-- set, so the total count is never revealed. The mystery pick is deterministic
-- per (user, day): stable if the page is reopened today, fresh tomorrow. The
-- client only ever receives the chosen few, and only their code/name/icon.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.get_my_discovery_gallery()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', a.code, 'name', a.name, 'icon', a.icon,
        'discovered', true, 'category', a.category, 'message', a.description,
        'discoveredAt', ud.revealed_at
      ) order by ud.revealed_at desc)
      from public.discovery_achievements a
      join public.user_discoveries ud
        on ud.achievement_id = a.id and ud.user_id = auth.uid() and ud.revealed_at is not null
      where a.enabled
    ), '[]'::jsonb)
    ||
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', code, 'name', name, 'icon', icon,
        'discovered', false, 'category', null, 'message', null, 'discoveredAt', null
      ) order by ord)
      from (
        select a.code, a.name, a.icon,
          md5(a.code || coalesce(auth.uid()::text, '') || current_date::text) as ord
        from public.discovery_achievements a
        where a.enabled
          and not exists (
            select 1 from public.user_discoveries ud
            where ud.achievement_id = a.id and ud.user_id = auth.uid() and ud.revealed_at is not null
          )
        order by md5(a.code || coalesce(auth.uid()::text, '') || current_date::text)
        limit 5
      ) picked
    ), '[]'::jsonb);
$$;
revoke execute on function public.get_my_discovery_gallery() from public, anon;
grant execute on function public.get_my_discovery_gallery() to authenticated;
