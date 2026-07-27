-- ═══════════════════════════════════════════════════════════════════════════
-- Hidden Discovery — Phase 6: the Glowing You overview gallery.
--
-- Returns every ENABLED discovery for the caller:
--   • discovered  → code, name, icon, category, message, discoveredAt (full)
--   • undiscovered → code, name, icon ONLY (a visible mystery)
-- Undiscovered rows expose NO condition, rarity, category, message, progress, or
-- count. Disabled/unsupported discoveries never appear (nothing unwinnable is
-- teased). Discovered first (newest), then the mysteries. auth.uid()-scoped.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.get_my_discovery_gallery()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by ord, sort_date desc nulls last, sort_name), '[]'::jsonb)
  from (
    select
      jsonb_build_object(
        'code', a.code,
        'name', a.name,
        'icon', a.icon,
        'discovered', (ud.revealed_at is not null),
        'category', case when ud.revealed_at is not null then a.category end,
        'message', case when ud.revealed_at is not null then a.description end,
        'discoveredAt', ud.revealed_at
      ) as item,
      case when ud.revealed_at is not null then 0 else 1 end as ord,
      ud.revealed_at as sort_date,
      a.name as sort_name
    from public.discovery_achievements a
    left join public.user_discoveries ud
      on ud.achievement_id = a.id and ud.user_id = auth.uid() and ud.revealed_at is not null
    where a.enabled
  ) s;
$$;
revoke execute on function public.get_my_discovery_gallery() from public, anon;
grant execute on function public.get_my_discovery_gallery() to authenticated;
