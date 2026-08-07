-- ═══════════════════════════════════════════════════════════════════════════
-- Food Library · Phase 2A Sprint 2 — Operations RPCs (governance layer)
--
-- All writes to the Food Library go through these role-gated SECURITY DEFINER
-- functions; direct client writes stay closed. Risk-based approval:
--   Editor-only (audited): create draft, add alias, tags, rename, add nutrition draft
--   Reviewer approval (maker-checker): publish food, publish nutrition, merge,
--                                      archive, change primary source
-- No import pipeline, no UI, no AI in this migration.
-- ═══════════════════════════════════════════════════════════════════════════

-- Normalisation shared by aliases + inbox matching (keeps CJK, drops space/punct).
create or replace function public.food_normalize(p text)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(lower(trim(coalesce(p, ''))), '[[:space:][:punct:]]+', '', 'g');
$$;

-- Append-only audit helper (actor = the real caller).
create or replace function public._food_audit(
  p_action text, p_entity_type text, p_entity_id uuid, p_before jsonb, p_after jsonb
)
returns void language sql security definer set search_path = '' as $$
  insert into public.food_audit_log (actor, action, entity_type, entity_id, before, after)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after);
$$;

-- ── Staff management (Food Admin only) ──────────────────────────────────────
create or replace function public.food_grant_staff(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.food_is_admin() then raise exception '需要 Food Admin 权限'; end if;
  if p_role not in ('food_editor','food_reviewer','food_admin') then raise exception '无效角色'; end if;
  insert into public.food_staff (user_id, food_role, is_active, granted_by)
    values (p_user, p_role, true, auth.uid())
  on conflict (user_id) do update set food_role = excluded.food_role, is_active = true, granted_by = auth.uid(), granted_at = now();
  perform public._food_audit('staff.grant', 'staff', p_user, null, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.food_revoke_staff(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.food_is_admin() then raise exception '需要 Food Admin 权限'; end if;
  update public.food_staff set is_active = false where user_id = p_user;
  perform public._food_audit('staff.revoke', 'staff', p_user, null, null);
end;
$$;

-- ── Editor low-risk ops (Food Editor+) ──────────────────────────────────────
create or replace function public.food_create_draft(
  p_canonical_name text, p_cuisine text default 'other', p_kind text default 'dish',
  p_brand text default null, p_plate_category text default null, p_dietary_tags text[] default '{}'
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.food_can_edit() then raise exception '需要 Food Editor 权限'; end if;
  if coalesce(trim(p_canonical_name), '') = '' then raise exception '食物名称不能为空'; end if;
  insert into public.foods (canonical_name, cuisine, kind, brand, plate_category, dietary_tags, status)
    values (p_canonical_name, p_cuisine, p_kind, p_brand, p_plate_category, coalesce(p_dietary_tags,'{}'), 'draft')
    returning id into v_id;
  insert into public.food_aliases (food_id, alias, normalized_key, language, match_type)
    values (v_id, p_canonical_name, public.food_normalize(p_canonical_name), 'other', 'canonical');
  perform public._food_audit('food.create_draft', 'food', v_id, null, jsonb_build_object('canonical_name', p_canonical_name));
  return v_id;
end;
$$;

create or replace function public.food_add_alias(
  p_food_id uuid, p_alias text, p_language text default 'other', p_match_type text default 'synonym'
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_norm text; v_id uuid;
begin
  if not public.food_can_edit() then raise exception '需要 Food Editor 权限'; end if;
  v_norm := public.food_normalize(p_alias);
  if v_norm = '' then raise exception '别名不能为空'; end if;
  -- Alias conflict: this normalized key already belongs to a DIFFERENT, non-merged food.
  if exists (
    select 1 from public.food_aliases a join public.foods f on f.id = a.food_id
    where a.normalized_key = v_norm and a.food_id <> p_food_id and f.status <> 'merged'
  ) then
    raise exception '别名「%」已属于另一个食物，请改用合并或换名', p_alias;
  end if;
  insert into public.food_aliases (food_id, alias, normalized_key, language, match_type)
    values (p_food_id, p_alias, v_norm, p_language, p_match_type)
  on conflict (food_id, normalized_key) do nothing
  returning id into v_id;
  perform public._food_audit('alias.add', 'alias', v_id, null, jsonb_build_object('food_id', p_food_id, 'alias', p_alias));
  return v_id;
end;
$$;

create or replace function public.food_update_tags(p_food_id uuid, p_dietary_tags text[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_before text[];
begin
  if not public.food_can_edit() then raise exception '需要 Food Editor 权限'; end if;
  select dietary_tags into v_before from public.foods where id = p_food_id;
  update public.foods set dietary_tags = coalesce(p_dietary_tags,'{}') where id = p_food_id;
  perform public._food_audit('food.update_tags', 'food', p_food_id,
    jsonb_build_object('dietary_tags', v_before), jsonb_build_object('dietary_tags', p_dietary_tags));
end;
$$;

create or replace function public.food_rename(p_food_id uuid, p_canonical_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_before text;
begin
  if not public.food_can_edit() then raise exception '需要 Food Editor 权限'; end if;
  if coalesce(trim(p_canonical_name), '') = '' then raise exception '名称不能为空'; end if;
  select canonical_name into v_before from public.foods where id = p_food_id;
  update public.foods set canonical_name = p_canonical_name where id = p_food_id;
  perform public._food_audit('food.rename', 'food', p_food_id,
    jsonb_build_object('canonical_name', v_before), jsonb_build_object('canonical_name', p_canonical_name));
end;
$$;

-- Add a nutrition VERSION as a draft (is_current = false). Making it live is gated.
create or replace function public.food_add_nutrition_draft(
  p_food_id uuid, p_source_code text, p_basis text,
  p_calories numeric, p_protein numeric, p_carbohydrate numeric, p_fat numeric,
  p_fiber numeric default 0, p_serving_g numeric default null, p_serving_name text default null,
  p_sodium_mg numeric default null, p_sugar_g numeric default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_source uuid; v_version integer; v_id uuid;
begin
  if not public.food_can_edit() then raise exception '需要 Food Editor 权限'; end if;
  select id into v_source from public.food_sources where code = p_source_code and is_active;
  if v_source is null then raise exception '未知或未启用的营养来源：%', p_source_code; end if;
  if p_basis = 'per_serving' and coalesce(p_serving_g, 0) <= 0 then raise exception 'per_serving 需要有效的 serving_g'; end if;
  select coalesce(max(version), 0) + 1 into v_version from public.food_nutrition where food_id = p_food_id and basis = p_basis;
  insert into public.food_nutrition (food_id, source_id, basis, serving_g, serving_name, calories, protein, carbohydrate, fat, fiber, sodium_mg, sugar_g, version, is_current)
    values (p_food_id, v_source, p_basis, p_serving_g, p_serving_name, p_calories, p_protein, p_carbohydrate, p_fat, coalesce(p_fiber,0), p_sodium_mg, p_sugar_g, v_version, false)
    returning id into v_id;
  perform public._food_audit('nutrition.add_draft', 'nutrition', v_id, null, jsonb_build_object('food_id', p_food_id, 'version', v_version));
  return v_id;
end;
$$;

-- ── Maker-checker: submit + review high-risk proposals ──────────────────────
create or replace function public.food_submit_proposal(
  p_type text, p_target_food_id uuid, p_payload jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.food_can_edit() then raise exception '需要 Food Editor 权限'; end if;
  if p_type not in ('publish_food','publish_nutrition','merge','archive','change_primary_source') then raise exception '无效提案类型'; end if;
  if p_target_food_id is null then raise exception '缺少目标食物'; end if;
  if p_type in ('publish_nutrition','change_primary_source') and not exists (
       select 1 from public.food_nutrition where id = (p_payload->>'nutrition_id')::uuid and food_id = p_target_food_id
     ) then raise exception 'payload.nutrition_id 无效'; end if;
  if p_type = 'merge' and (p_payload->>'merge_into_id') is null then raise exception 'merge 需要 merge_into_id'; end if;

  insert into public.food_change_proposals (proposal_type, target_food_id, payload, submitted_by)
    values (p_type, p_target_food_id, coalesce(p_payload,'{}'::jsonb), auth.uid())
    returning id into v_id;
  if p_type = 'publish_food' then
    update public.foods set status = 'in_review' where id = p_target_food_id and status = 'draft';
  end if;
  perform public._food_audit('proposal.submit', 'proposal', v_id, null, jsonb_build_object('type', p_type, 'food_id', p_target_food_id));
  return v_id;
end;
$$;

create or replace function public.food_review_proposal(p_id uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_p public.food_change_proposals; v_nid uuid; v_food_id uuid; v_basis text;
begin
  if not public.food_can_review() then raise exception '需要 Food Reviewer 权限'; end if;
  if p_decision not in ('approve','reject') then raise exception '无效决定'; end if;
  select * into v_p from public.food_change_proposals where id = p_id for update;
  if v_p.id is null then raise exception '提案不存在'; end if;
  if v_p.status <> 'pending' then raise exception '提案已处理'; end if;
  -- Separation of duties: the submitter cannot approve their own change.
  if p_decision = 'approve' and v_p.submitted_by = auth.uid() then raise exception '不能审批自己提交的变更'; end if;

  if p_decision = 'reject' then
    update public.food_change_proposals set status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), review_note=p_note where id = p_id;
    perform public._food_audit('proposal.reject', 'proposal', p_id, null, jsonb_build_object('note', p_note));
    return;
  end if;

  -- APPLY on approve, dispatched by type.
  if v_p.proposal_type = 'publish_food' then
    update public.foods set status='active' where id = v_p.target_food_id and status in ('draft','in_review');
    -- Any inbox item that created this food now counts as published.
    update public.food_match_misses set status='published', reviewed_by=auth.uid(), reviewed_at=now()
      where resolved_food_id = v_p.target_food_id and status = 'reviewing';

  elsif v_p.proposal_type = 'publish_nutrition' then
    v_nid := (v_p.payload->>'nutrition_id')::uuid;
    select food_id, basis into v_food_id, v_basis from public.food_nutrition where id = v_nid;
    update public.food_nutrition set is_current=false where food_id=v_food_id and basis=v_basis and is_current and id <> v_nid;
    update public.food_nutrition set is_current=true, valid_from=current_date where id = v_nid;

  elsif v_p.proposal_type = 'merge' then
    -- Move aliases onto the survivor, then mark the loser merged.
    update public.food_aliases set food_id = (v_p.payload->>'merge_into_id')::uuid
      where food_id = v_p.target_food_id
      and normalized_key not in (select normalized_key from public.food_aliases where food_id = (v_p.payload->>'merge_into_id')::uuid);
    update public.foods set status='merged', merged_into_id=(v_p.payload->>'merge_into_id')::uuid where id = v_p.target_food_id;

  elsif v_p.proposal_type = 'archive' then
    update public.foods set status='archived' where id = v_p.target_food_id;

  elsif v_p.proposal_type = 'change_primary_source' then
    update public.foods set primary_nutrition_id = (v_p.payload->>'nutrition_id')::uuid where id = v_p.target_food_id;
  end if;

  update public.food_change_proposals set status='approved', reviewed_by=auth.uid(), reviewed_at=now(), review_note=p_note where id = p_id;
  perform public._food_audit('proposal.approve', 'proposal', p_id, null, jsonb_build_object('type', v_p.proposal_type, 'food_id', v_p.target_food_id));
end;
$$;

-- ── Recognition Inbox ───────────────────────────────────────────────────────
-- Recompute priority for open items (occurrences · recency · confidence · has-similar).
create or replace function public.food_inbox_recompute()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if not public.food_can_edit() then raise exception '需要 Food Editor 权限'; end if;
  update public.food_match_misses m
    set priority_score = public.food_inbox_priority(
      m.occurrences, m.last_seen_at, m.confidence,
      exists (select 1 from public.food_aliases a where a.normalized_key = m.normalized_name))
    where m.status in ('new','reviewing');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.food_inbox_claim(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.food_can_edit() then raise exception '需要 Food Editor 权限'; end if;
  update public.food_match_misses
    set status='reviewing', claimed_by=auth.uid(), claimed_at=now()
    where id = p_id and status in ('new','reviewing');
  perform public._food_audit('inbox.claim', 'inbox', p_id, null, null);
end;
$$;

-- Triage: link an existing food (adds alias, resolves), create a new draft food
-- (links; publishes when its food is approved), or ignore.
create or replace function public.food_inbox_triage(p_id uuid, p_action text, p_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_miss public.food_match_misses; v_food uuid;
begin
  if not public.food_can_edit() then raise exception '需要 Food Editor 权限'; end if;
  select * into v_miss from public.food_match_misses where id = p_id for update;
  if v_miss.id is null then raise exception '收件箱条目不存在'; end if;

  if p_action = 'ignore' then
    update public.food_match_misses set status='ignored', reviewed_by=auth.uid(), reviewed_at=now() where id = p_id;
    perform public._food_audit('inbox.ignore', 'inbox', p_id, null, null);
    return null;

  elsif p_action = 'link_existing' then
    v_food := (p_payload->>'food_id')::uuid;
    if v_food is null then raise exception 'link_existing 需要 food_id'; end if;
    perform public.food_add_alias(v_food, v_miss.original_name, 'other', 'ai');
    update public.food_match_misses set status='published', resolved_food_id=v_food, reviewed_by=auth.uid(), reviewed_at=now() where id = p_id;
    perform public._food_audit('inbox.link_existing', 'inbox', p_id, null, jsonb_build_object('food_id', v_food));
    return v_food;

  elsif p_action = 'create_new' then
    v_food := public.food_create_draft(
      coalesce(p_payload->>'canonical_name', v_miss.original_name),
      coalesce(p_payload->>'cuisine', 'other'),
      coalesce(p_payload->>'kind', 'dish'));
    -- keep the recognised spelling as an alias too
    perform public.food_add_alias(v_food, v_miss.original_name, 'other', 'ai');
    update public.food_match_misses set status='reviewing', resolved_food_id=v_food, reviewed_by=auth.uid(), reviewed_at=now() where id = p_id;
    perform public._food_audit('inbox.create_new', 'inbox', p_id, null, jsonb_build_object('food_id', v_food));
    return v_food;
  end if;
  raise exception '无效操作：%', p_action;
end;
$$;

-- Lock down direct anon execution; internal role checks gate everything else.
revoke execute on function
  public.food_grant_staff(uuid, text), public.food_revoke_staff(uuid),
  public.food_create_draft(text, text, text, text, text, text[]),
  public.food_add_alias(uuid, text, text, text),
  public.food_update_tags(uuid, text[]), public.food_rename(uuid, text),
  public.food_add_nutrition_draft(uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text, numeric, numeric),
  public.food_submit_proposal(text, uuid, jsonb), public.food_review_proposal(uuid, text, text),
  public.food_inbox_recompute(), public.food_inbox_claim(uuid), public.food_inbox_triage(uuid, text, jsonb),
  public._food_audit(text, text, uuid, jsonb, jsonb)
from anon;
