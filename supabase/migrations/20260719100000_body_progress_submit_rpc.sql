-- Body Progress Module (SP-005) — Sprint 002: atomic submission RPC.
-- No customer_id parameter at all — identity comes only from auth.uid(),
-- never from client input. p_record_id is client-generated (same
-- idempotency-key pattern as record_morning_checkin's p_checkin_id /
-- record_meal's p_meal_id): calling again with the same id-that-already-
-- belongs-to-you is a safe no-op ("alreadyRecorded"), calling with an id
-- that belongs to someone else is rejected outright.
--
-- p_photos is an array of {angle, ext} only — never a client-supplied path.
-- The canonical Storage path ({customer_id}/{record_id}/{angle}.{ext}) is
-- reconstructed here from trusted server-side values and then checked
-- against storage.objects, so "does this path follow the convention" is
-- true by construction rather than by parsing/regex, and "was this file
-- actually uploaded" is verified in the same step.

create or replace function public.submit_body_progress(
  p_record_id uuid,
  p_photos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_existing_customer uuid;
  v_distinct_angle_count integer;
  v_start_date date;
  v_journey_date date;
  v_journey_day integer;
  v_journey_plan_days smallint;
  v_weight_value numeric(5, 1);
  v_weight_unit text;
  v_source_checkin_id uuid;
  v_source_checkin_date date;
  v_item jsonb;
  v_angle text;
  v_ext text;
  v_path text;
begin
  if v_customer_id is null then
    raise exception '请先登录';
  end if;

  -- p_record_id is typed uuid, so a malformed string is already rejected by
  -- Postgres before this function body ever runs (the strongest possible
  -- check). The one case that can still reach here is an explicit null.
  if p_record_id is null then
    raise exception '缺少有效的记录编号';
  end if;

  if not exists (select 1 from public.profiles where id = v_customer_id and role = 'customer') then
    raise exception '只有顾客可以提交身形记录';
  end if;

  -- Idempotency / ownership check: same record_id called again is a safe
  -- retry; someone else's record_id is rejected, not silently accepted.
  select customer_id into v_existing_customer from public.body_progress_records where id = p_record_id;
  if found then
    if v_existing_customer is distinct from v_customer_id then
      raise exception '该记录编号不属于你';
    end if;
    return jsonb_build_object('ok', true, 'alreadyRecorded', true, 'recordId', p_record_id);
  end if;

  if p_photos is null or jsonb_typeof(p_photos) is distinct from 'array' or jsonb_array_length(p_photos) is distinct from 4 then
    raise exception '必须提供正好 4 张照片（正面、左侧、右侧、背面）';
  end if;

  -- Each angle is cast to the enum: an invalid string raises naturally here;
  -- a missing angle key becomes NULL, which count(distinct ...) ignores —
  -- either way, anything other than exactly the 4 legal distinct angles
  -- fails the count check below (this single check catches duplicates,
  -- missing angles, and typos all at once, since the domain only has 4
  -- legal values).
  select count(distinct (elem ->> 'angle')::public.body_progress_angle)
    into v_distinct_angle_count
    from jsonb_array_elements(p_photos) elem;

  if v_distinct_angle_count is distinct from 4 then
    raise exception '四个角度必须各不相同且齐全（正面、左侧、右侧、背面）';
  end if;

  for v_item in select * from jsonb_array_elements(p_photos)
  loop
    v_angle := v_item ->> 'angle';
    v_ext := lower(v_item ->> 'ext');

    if v_ext is null or v_ext not in ('jpg', 'jpeg', 'png', 'webp') then
      raise exception '不支持的图片格式：%', coalesce(v_ext, '(缺失)');
    end if;

    v_path := v_customer_id::text || '/' || p_record_id::text || '/' || v_angle || '.' || v_ext;

    if not exists (select 1 from storage.objects where bucket_id = 'body-progress-photos' and name = v_path) then
      raise exception '找不到已上传的照片：%', v_angle;
    end if;
  end loop;

  -- Journey Day is frozen at submission time (same formula as the existing
  -- client-side calculateCurrentDay()), so it stays correct in the Timeline
  -- even after a customer starts a new Journey later.
  select start_date into v_start_date from public.profiles where id = v_customer_id;
  v_journey_date := public.customer_journey_date(v_customer_id);
  v_journey_day := greatest(1, coalesce((v_journey_date - v_start_date) + 1, 1));

  select journey_days into v_journey_plan_days
    from public.goal_plans
    where customer_id = v_customer_id
    order by created_at desc
    limit 1;

  if v_journey_plan_days is null then
    raise exception '找不到目前的 Journey 计划';
  end if;

  -- Weight Snapshot: same journey-date check-in first, else the most recent
  -- one of any date, else left empty — must never block submission.
  select weight, id, checkin_date into v_weight_value, v_source_checkin_id, v_source_checkin_date
    from public.daily_checkins
    where customer_id = v_customer_id and checkin_date = v_journey_date;

  if not found then
    select weight, id, checkin_date into v_weight_value, v_source_checkin_id, v_source_checkin_date
      from public.daily_checkins
      where customer_id = v_customer_id
      order by checkin_date desc
      limit 1;
  end if;

  if v_weight_value is not null then
    v_weight_unit := 'kg';
  end if;

  insert into public.body_progress_records
    (id, customer_id, journey_day, journey_plan_days, weight_value, weight_unit, source_checkin_id, source_checkin_date)
  values
    (p_record_id, v_customer_id, v_journey_day, v_journey_plan_days, v_weight_value, v_weight_unit, v_source_checkin_id, v_source_checkin_date);

  for v_item in select * from jsonb_array_elements(p_photos)
  loop
    v_angle := v_item ->> 'angle';
    v_ext := lower(v_item ->> 'ext');
    v_path := v_customer_id::text || '/' || p_record_id::text || '/' || v_angle || '.' || v_ext;

    insert into public.body_progress_photos (record_id, angle, original_path)
    values (p_record_id, v_angle::public.body_progress_angle, v_path);
  end loop;

  return jsonb_build_object('ok', true, 'alreadyRecorded', false, 'recordId', p_record_id, 'journeyDay', v_journey_day);
end;
$$;

revoke execute on function public.submit_body_progress(uuid, jsonb) from anon;
grant execute on function public.submit_body_progress(uuid, jsonb) to authenticated;
