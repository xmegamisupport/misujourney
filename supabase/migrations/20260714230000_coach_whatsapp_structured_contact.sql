-- ---------- Structured Coach WhatsApp contact info ----------
-- Replaces the single free-text whatsapp_number with country-code-aware
-- fields so the customer-facing wa.me link is never built from a guessed
-- country. The old whatsapp_number column is kept (not dropped) — existing
-- data is migrated conservatively below, never dropped.
alter table public.profiles
  add column whatsapp_country_code text,
  add column whatsapp_country_iso text,
  add column whatsapp_local_number text,
  add column whatsapp_normalized_number text,
  add column whatsapp_custom_link text,
  add column whatsapp_contact_method text not null default 'generated_number',
  add column whatsapp_needs_review boolean not null default false;

alter table public.profiles
  add constraint profiles_whatsapp_contact_method_check check (whatsapp_contact_method in ('generated_number', 'custom_link'));

-- ---------- Phone normalization (country-code-aware, not Malaysia-only) ----------
-- Mirrors normalizeInternationalPhoneNumber() in src/lib/whatsapp.ts exactly
-- so the server-computed value the client can preview never disagrees with
-- what's actually stored.
create or replace function public.normalize_international_phone_number(p_country_calling_code text, p_local_phone_number text)
returns text
language plpgsql immutable
set search_path = ''
as $$
declare
  v_code text;
  v_digits text;
begin
  v_code := regexp_replace(coalesce(p_country_calling_code, ''), '[^0-9]', '', 'g');
  if v_code = '' then
    return null;
  end if;

  v_digits := regexp_replace(coalesce(p_local_phone_number, ''), '[^0-9]', '', 'g');
  if v_digits = '' then
    return null;
  end if;

  if left(v_digits, length(v_code)) = v_code then
    -- already carries the country code (e.g. pasted "+60123456789" into the
    -- local-number field) — use as-is, don't double-prepend.
    null;
  elsif left(v_digits, 1) = '0' then
    v_digits := v_code || substring(v_digits from 2);
  else
    v_digits := v_code || v_digits;
  end if;

  if length(v_digits) < 8 or length(v_digits) > 15 then
    return null;
  end if;

  return v_digits;
end;
$$;

revoke execute on function public.normalize_international_phone_number(text, text) from anon, authenticated;

-- ---------- Write path: Coach edits their own, Admin can edit any Coach's ----------
-- profiles has no direct UPDATE grant to authenticated — this is the one
-- narrow write path for WhatsApp contact info, computing the normalized
-- number itself server-side rather than trusting a client-supplied value,
-- and re-validating the custom link server-side too (never trust the
-- frontend check alone).
create or replace function public.update_coach_whatsapp_contact(
  p_coach_id uuid,
  p_whatsapp_country_code text,
  p_whatsapp_country_iso text,
  p_whatsapp_local_number text,
  p_whatsapp_custom_link text,
  p_whatsapp_contact_method text
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_target_role public.user_role;
  v_normalized text;
begin
  if not (auth.uid() = p_coach_id or public.current_role() = 'admin') then
    raise exception '没有权限编辑这位教练的联络资料';
  end if;

  select role into v_target_role from public.profiles where id = p_coach_id;
  if v_target_role is distinct from 'coach' then
    raise exception '只能编辑 Coach 的联络资料';
  end if;

  if p_whatsapp_contact_method not in ('generated_number', 'custom_link') then
    raise exception '无效的联络方式';
  end if;

  if p_whatsapp_contact_method = 'custom_link' then
    if p_whatsapp_custom_link is null or p_whatsapp_custom_link !~* '^https://([a-z0-9-]+\.)?(wa\.me|api\.whatsapp\.com|whatsapp\.com)(/|\?|$)' then
      raise exception '自定义 WhatsApp 链接无效，只接受 wa.me / api.whatsapp.com / whatsapp.com';
    end if;
  end if;

  v_normalized := public.normalize_international_phone_number(p_whatsapp_country_code, p_whatsapp_local_number);

  update public.profiles set
    whatsapp_country_code = nullif(trim(p_whatsapp_country_code), ''),
    whatsapp_country_iso = nullif(trim(p_whatsapp_country_iso), ''),
    whatsapp_local_number = nullif(trim(p_whatsapp_local_number), ''),
    whatsapp_normalized_number = v_normalized,
    whatsapp_custom_link = case when p_whatsapp_contact_method = 'custom_link' then nullif(trim(p_whatsapp_custom_link), '') else null end,
    whatsapp_contact_method = p_whatsapp_contact_method,
    whatsapp_needs_review = false,
    updated_at = now()
  where id = p_coach_id;
end;
$$;

revoke execute on function public.update_coach_whatsapp_contact(uuid, text, text, text, text, text) from anon;
grant execute on function public.update_coach_whatsapp_contact(uuid, text, text, text, text, text) to authenticated;

-- Superseded by update_coach_whatsapp_contact (which also allows Admin to
-- edit any Coach, not just self) — same self-only capability plus more.
drop function if exists public.update_my_whatsapp_number(text);

-- ---------- Read path: customer only ever gets their own bound coach's contact ----------
-- Same no-parameter, auth.uid()-derived pattern as before — a customer can
-- never look up any other coach's contact info. Now returns the pieces
-- needed to compute the priority-ordered WhatsApp URL client-side (custom
-- link vs generated number) instead of a single raw phone number.
drop function if exists public.get_my_coach_contact();

create function public.get_my_coach_contact()
returns table (
  coach_id uuid,
  name text,
  avatar text,
  whatsapp_contact_method text,
  whatsapp_normalized_number text,
  whatsapp_custom_link text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.avatar, p.whatsapp_contact_method, p.whatsapp_normalized_number, p.whatsapp_custom_link
  from public.profiles p
  where p.id = (select coach_id from public.profiles where id = auth.uid());
$$;

revoke execute on function public.get_my_coach_contact() from public;
grant execute on function public.get_my_coach_contact() to authenticated;

-- ---------- Data migration: never guess a country for existing numbers ----------
-- whatsapp_number (old flat field) is preserved as-is. Any Coach who already
-- had a value there gets it copied into whatsapp_local_number and flagged
-- for review — country/normalized fields stay null until the Coach (or
-- Admin) confirms the actual country via the new form.
update public.profiles
set
  whatsapp_local_number = whatsapp_number,
  whatsapp_needs_review = true
where role = 'coach' and whatsapp_number is not null and whatsapp_normalized_number is null;
