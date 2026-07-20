-- Every nutrition label a customer photographs becomes a shared record.
--
-- Written but not yet READ: nothing looks a product up from here today. That is
-- deliberate. Matching needs a key we can trust (barcode, or a normalisation we
-- have tested against real labels), and picking one before seeing what real
-- packets produce would be guessing. What is cheap now and impossible later is
-- the collecting — a packet photographed today and not saved is gone.
--
-- This is also the dataset 🥗 Healthy Picks needs: 超市好物, 健康面食,
-- 便利店推荐 all require Malaysian packaged-food nutrition, and this fills from
-- real customer behaviour rather than from someone typing out a catalogue.
create table if not exists public.packaged_foods (
  id uuid primary key default gen_random_uuid(),
  brand text not null default '',
  product_name text not null,
  match_key text not null,
  serving_size_g numeric(8,2) not null check (serving_size_g > 0),
  servings_per_package numeric(8,2) not null check (servings_per_package > 0),
  calories_per_100g numeric(8,2) not null check (calories_per_100g >= 0),
  protein_per_100g numeric(8,2) not null default 0,
  carbohydrate_per_100g numeric(8,2) not null default 0,
  fat_per_100g numeric(8,2) not null default 0,
  fiber_per_100g numeric(8,2) not null default 0,
  contributed_by uuid references public.profiles(id) on delete set null,
  times_seen integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists packaged_foods_match_key_uniq on public.packaged_foods (match_key);

alter table public.packaged_foods enable row level security;

-- A product catalogue, not personal data.
create policy "signed in users read packaged foods"
  on public.packaged_foods for select
  to authenticated using (true);

-- No insert policy: every row goes through the function, so validation cannot
-- be bypassed by writing to the table directly.
create or replace function public.save_packaged_food(
  p_brand text,
  p_product_name text,
  p_serving_size_g numeric,
  p_servings_per_package numeric,
  p_calories_per_100g numeric,
  p_protein_per_100g numeric,
  p_carbohydrate_per_100g numeric,
  p_fat_per_100g numeric,
  p_fiber_per_100g numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  if auth.uid() is null then
    raise exception '请先登录';
  end if;
  -- Silently decline junk rather than raising: this runs alongside her meal
  -- record, and a useless library row is not worth failing that over.
  if coalesce(trim(p_product_name), '') = '' or p_serving_size_g is null or p_serving_size_g <= 0
     or p_servings_per_package is null or p_servings_per_package <= 0
     or p_calories_per_100g is null or p_calories_per_100g <= 0 then
    return;
  end if;

  v_key := lower(regexp_replace(coalesce(trim(p_brand), '') || ' ' || trim(p_product_name), '\s+', ' ', 'g'));

  insert into public.packaged_foods (
    brand, product_name, match_key, serving_size_g, servings_per_package,
    calories_per_100g, protein_per_100g, carbohydrate_per_100g, fat_per_100g, fiber_per_100g,
    contributed_by
  ) values (
    coalesce(trim(p_brand), ''), trim(p_product_name), v_key, p_serving_size_g, p_servings_per_package,
    p_calories_per_100g, coalesce(p_protein_per_100g, 0), coalesce(p_carbohydrate_per_100g, 0),
    coalesce(p_fat_per_100g, 0), coalesce(p_fiber_per_100g, 0),
    auth.uid()
  )
  on conflict (match_key) do update
    set times_seen = public.packaged_foods.times_seen + 1,
        updated_at = now();
end;
$$;

grant execute on function public.save_packaged_food(text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric) to authenticated;
