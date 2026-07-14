-- A Coach pasting just "wa.me/60123456789" (the text you actually get
-- copying a link out of WhatsApp, with no https:// prefix) was rejected
-- outright by the strict https://... regex. Tolerate a schemeless input by
-- assuming https:// for it — same as the client-side validateCustomWhatsAppLink
-- fix — while still rejecting anything that explicitly specifies a non-https
-- scheme (http://, javascript:, etc).
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
  v_custom_link text;
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
    v_custom_link := trim(coalesce(p_whatsapp_custom_link, ''));
    if v_custom_link = '' then
      raise exception '自定义 WhatsApp 链接无效，只接受 wa.me / api.whatsapp.com / whatsapp.com';
    end if;
    if v_custom_link !~* '^[a-z][a-z0-9+.-]*://' then
      v_custom_link := 'https://' || v_custom_link;
    end if;
    if v_custom_link !~* '^https://([a-z0-9-]+\.)?(wa\.me|api\.whatsapp\.com|whatsapp\.com)(/|\?|$)' then
      raise exception '自定义 WhatsApp 链接无效，只接受 wa.me / api.whatsapp.com / whatsapp.com';
    end if;
  end if;

  v_normalized := public.normalize_international_phone_number(p_whatsapp_country_code, p_whatsapp_local_number);

  update public.profiles set
    whatsapp_country_code = nullif(trim(p_whatsapp_country_code), ''),
    whatsapp_country_iso = nullif(trim(p_whatsapp_country_iso), ''),
    whatsapp_local_number = nullif(trim(p_whatsapp_local_number), ''),
    whatsapp_normalized_number = v_normalized,
    whatsapp_custom_link = case when p_whatsapp_contact_method = 'custom_link' then v_custom_link else null end,
    whatsapp_contact_method = p_whatsapp_contact_method,
    whatsapp_needs_review = false,
    updated_at = now()
  where id = p_coach_id;
end;
$$;
