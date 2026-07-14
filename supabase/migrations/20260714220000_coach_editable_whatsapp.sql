-- ---------- Let a Coach self-edit their own WhatsApp contact number ----------
-- profiles has no direct UPDATE grant for authenticated (all writes go
-- through RPCs) — this is a narrow one that only ever touches the caller's
-- own whatsapp_number, nothing else.
create or replace function public.update_my_whatsapp_number(p_whatsapp_number text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception '未登录';
  end if;

  update public.profiles
  set whatsapp_number = nullif(trim(p_whatsapp_number), ''), updated_at = now()
  where id = auth.uid();
end;
$$;

revoke execute on function public.update_my_whatsapp_number(text) from anon;
grant execute on function public.update_my_whatsapp_number(text) to authenticated;
