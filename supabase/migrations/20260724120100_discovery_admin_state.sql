-- ═══════════════════════════════════════════════════════════════════════════
-- Hidden Discovery — Phase 4: one admin-gated read for the Inspector. Returns
-- the target user's snapshot + unlock history + queue, with the discovery CODE
-- joined in (so the catalogue mapping never has to leave the server). Admin only.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.admin_discovery_state(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then null
    else jsonb_build_object(
      'snapshot', public._hidden_discovery_snapshot(p_user_id),
      'unlocks', coalesce((
        select jsonb_agg(jsonb_build_object(
          'code', a.code,
          'unlockedAt', ud.unlocked_at,
          'revealedAt', ud.revealed_at,
          'sourceEvent', ud.source_event,
          'triggerEvidence', ud.trigger_evidence,
          'registryVersion', ud.registry_version,
          'unlockScope', a.unlock_scope,
          'journeyId', ud.journey_id,
          'stage', ud.stage,
          'dedupKey', ud.dedup_key
        ) order by ud.unlocked_at desc)
        from public.user_discoveries ud
        join public.discovery_achievements a on a.id = ud.achievement_id
        where ud.user_id = p_user_id
      ), '[]'::jsonb),
      'queue', coalesce((
        select jsonb_agg(jsonb_build_object(
          'code', a.code,
          'status', qz.status,
          'priority', qz.priority,
          'queuedAt', qz.queued_at,
          'displayedAt', qz.displayed_at,
          'acknowledgedAt', qz.acknowledged_at
        ) order by qz.priority desc, qz.queued_at)
        from public.discovery_celebration_queue qz
        join public.discovery_achievements a on a.id = qz.achievement_id
        where qz.user_id = p_user_id
      ), '[]'::jsonb)
    )
  end;
$$;
revoke execute on function public.admin_discovery_state(uuid) from public, anon;
grant execute on function public.admin_discovery_state(uuid) to authenticated;
