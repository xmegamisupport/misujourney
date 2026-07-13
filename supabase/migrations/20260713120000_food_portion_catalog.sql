-- ---------- Food Portion System V3 (生活化份量) ----------
-- Replaces gram-based portion entry with a life-style portion catalog. AI
-- only identifies a food's name + category; the customer picks a portion
-- label ("半碗"/"一碗"/...); grams and macros are looked up here, never
-- estimated by AI and never shown to the customer.

create table public.food_portions (
  id uuid primary key default gen_random_uuid(),
  portion_type text not null check (portion_type in (
    'rice', 'noodle', 'congee', 'bread', 'chicken', 'beef', 'fish', 'egg',
    'vegetable', 'broccoli', 'fruit', 'milk', 'drink', 'fried', 'dessert'
  )),
  display_name text not null,
  emoji text not null default '',
  portion_label text not null,
  portion_value numeric not null,
  is_base_unit boolean not null default false,
  gram numeric not null,
  calories numeric not null,
  protein numeric not null,
  carbohydrate numeric not null,
  fat numeric not null,
  fiber numeric not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (portion_type, portion_label)
);

comment on table public.food_portions is 'Reference catalog only — not customer data. Grams/macros live here so AI never guesses them and customers never see them.';

alter table public.food_portions enable row level security;

-- Shared reference catalog: every authenticated role can read it, nobody
-- can write to it at runtime (rows are seeded/maintained via migration).
create policy "food_portions_select_all" on public.food_portions for select to authenticated using (true);

revoke truncate on public.food_portions from anon, authenticated;

insert into public.food_portions
  (portion_type, display_name, emoji, portion_label, portion_value, is_base_unit, gram, calories, protein, carbohydrate, fat, fiber, sort_order)
values
  ('rice', '白饭', '🍚', '半碗', 0.5, false, 100, 130, 2.7, 28.7, 0.3, 0.4, 1),
  ('rice', '白饭', '🍚', '一碗', 1, true, 150, 195, 4.1, 43.1, 0.5, 0.6, 2),
  ('rice', '白饭', '🍚', '一碗半', 1.5, false, 225, 293, 6.1, 64.6, 0.7, 0.9, 3),
  ('rice', '白饭', '🍚', '两碗', 2, false, 300, 390, 8.1, 86.1, 0.9, 1.2, 4),

  ('noodle', '面类', '🍜', '半碗', 0.5, false, 100, 137, 4.5, 27, 1.0, 1.2, 1),
  ('noodle', '面类', '🍜', '一碗', 1, true, 150, 206, 6.8, 40.5, 1.5, 1.8, 2),
  ('noodle', '面类', '🍜', '一碗半', 1.5, false, 225, 308, 10.1, 60.8, 2.3, 2.7, 3),
  ('noodle', '面类', '🍜', '两碗', 2, false, 300, 411, 13.5, 81, 3.0, 3.6, 4),

  ('congee', '粥', '🥣', '半碗', 0.5, false, 150, 45, 0.9, 9.9, 0.15, 0.15, 1),
  ('congee', '粥', '🥣', '一碗', 1, true, 300, 90, 1.8, 19.8, 0.3, 0.3, 2),
  ('congee', '粥', '🥣', '一碗半', 1.5, false, 450, 135, 2.7, 29.7, 0.45, 0.45, 3),

  ('bread', '面包', '🍞', '半片', 0.5, false, 15, 40, 1.5, 7.5, 0.5, 0.4, 1),
  ('bread', '面包', '🍞', '一片', 1, true, 30, 80, 3, 15, 1, 0.8, 2),
  ('bread', '面包', '🍞', '两片', 2, false, 60, 160, 6, 30, 2, 1.6, 3),
  ('bread', '面包', '🍞', '三片', 3, false, 90, 240, 9, 45, 3, 2.4, 4),

  ('chicken', '鸡肉', '🍗', '半个手掌', 0.5, false, 40, 66, 12.4, 0, 1.44, 0, 1),
  ('chicken', '鸡肉', '🍗', '一个手掌', 1, true, 80, 132, 24.8, 0, 2.88, 0, 2),
  ('chicken', '鸡肉', '🍗', '一个半手掌', 1.5, false, 120, 198, 37.2, 0, 4.32, 0, 3),
  ('chicken', '鸡肉', '🍗', '两个手掌', 2, false, 160, 264, 49.6, 0, 5.76, 0, 4),

  ('beef', '牛肉', '🥩', '半个手掌', 0.5, false, 40, 100, 10.4, 0, 6, 0, 1),
  ('beef', '牛肉', '🥩', '一个手掌', 1, true, 80, 200, 20.8, 0, 12, 0, 2),
  ('beef', '牛肉', '🥩', '一个半手掌', 1.5, false, 120, 300, 31.2, 0, 18, 0, 3),
  ('beef', '牛肉', '🥩', '两个手掌', 2, false, 160, 400, 41.6, 0, 24, 0, 4),

  ('fish', '鱼肉', '🐟', '半块', 0.5, false, 50, 60, 10, 0, 2, 0, 1),
  ('fish', '鱼肉', '🐟', '一块', 1, true, 100, 120, 20, 0, 4, 0, 2),
  ('fish', '鱼肉', '🐟', '两块', 2, false, 200, 240, 40, 0, 8, 0, 3),

  ('egg', '鸡蛋', '🥚', '一颗', 1, true, 50, 78, 6.5, 0.6, 5.3, 0, 1),
  ('egg', '鸡蛋', '🥚', '两颗', 2, false, 100, 156, 13, 1.2, 10.6, 0, 2),
  ('egg', '鸡蛋', '🥚', '三颗', 3, false, 150, 234, 19.5, 1.8, 15.9, 0, 3),

  ('vegetable', '蔬菜', '🥬', '一至两口', 0.3, false, 30, 8, 0.6, 1.5, 0.06, 0.54, 1),
  ('vegetable', '蔬菜', '🥬', '半份', 0.5, false, 50, 13, 1, 2.5, 0.1, 0.9, 2),
  ('vegetable', '蔬菜', '🥬', '一份', 1, true, 100, 25, 2, 5, 0.2, 1.8, 3),
  ('vegetable', '蔬菜', '🥬', '两份', 2, false, 200, 50, 4, 10, 0.4, 3.6, 4),

  ('broccoli', '花椰菜', '🥦', '一至两朵', 0.4, false, 40, 14, 1.1, 2.8, 0.16, 1.04, 1),
  ('broccoli', '花椰菜', '🥦', '半份', 0.5, false, 50, 17, 1.4, 3.5, 0.2, 1.3, 2),
  ('broccoli', '花椰菜', '🥦', '一份', 1, true, 100, 34, 2.8, 7, 0.4, 2.6, 3),

  ('fruit', '水果', '🍎', '半份', 0.5, false, 50, 30, 0.35, 7.5, 0.1, 1, 1),
  ('fruit', '水果', '🍎', '一份', 1, true, 100, 60, 0.7, 15, 0.2, 2, 2),
  ('fruit', '水果', '🍎', '两份', 2, false, 200, 120, 1.4, 30, 0.4, 4, 3),

  ('milk', '牛奶', '🥛', '半杯', 0.5, false, 120, 75, 4, 6, 4, 0, 1),
  ('milk', '牛奶', '🥛', '一杯', 1, true, 240, 150, 8, 12, 8, 0, 2),
  ('milk', '牛奶', '🥛', '两杯', 2, false, 480, 300, 16, 24, 16, 0, 3),

  ('drink', '饮料', '🥤', '小杯', 0.7, false, 350, 140, 0, 35, 0, 0, 1),
  ('drink', '饮料', '🥤', '中杯', 1, true, 500, 200, 0, 50, 0, 0, 2),
  ('drink', '饮料', '🥤', '大杯', 1.4, false, 700, 280, 0, 70, 0, 0, 3),

  ('fried', '炸物', '🍟', '一小份', 0.67, false, 100, 250, 8, 20, 16, 1.5, 1),
  ('fried', '炸物', '🍟', '一般份', 1, true, 150, 375, 12, 30, 24, 2.3, 2),
  ('fried', '炸物', '🍟', '大份', 1.47, false, 220, 550, 17.6, 44, 35.2, 3.3, 3),

  ('dessert', '甜品', '🍰', '一小份', 0.67, false, 80, 220, 3, 30, 9, 0.8, 1),
  ('dessert', '甜品', '🍰', '一份', 1, true, 120, 330, 4.5, 45, 13.5, 1.2, 2),
  ('dessert', '甜品', '🍰', '两份', 2, false, 240, 660, 9, 90, 27, 2.4, 3);

-- ---------- meals: add AI advice column, drop gram-era score, re-scope record_meal ----------
-- `misu_score` is repurposed (no schema change needed) to hold the new
-- deterministic 1-5 star 211 score instead of the old AI 0-100 score.
alter table public.meals add column ai_advice text not null default '';

drop function if exists public.record_meal(uuid, uuid, text, jsonb, jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text[], text[]);

create function public.record_meal(
  p_meal_id uuid,
  p_customer_id uuid,
  p_meal_type text,
  p_misu_items jsonb,
  p_food_items jsonb,
  p_name text,
  p_meal_time text,
  p_photo_emoji text,
  p_portion text,
  p_calories numeric,
  p_protein numeric,
  p_carbs numeric,
  p_fat numeric,
  p_fiber numeric,
  p_misu_score numeric,
  p_good_points text[],
  p_improve_points text[],
  p_ai_advice text default ''
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.product_code;
  v_qty integer;
  v_remaining integer;
  v_new_remaining integer;
begin
  if auth.uid() is distinct from p_customer_id then
    raise exception '只能记录自己的餐点';
  end if;

  if exists (select 1 from public.meals where id = p_meal_id) then
    return jsonb_build_object('ok', true, 'alreadyRecorded', true);
  end if;

  for v_item in select * from jsonb_array_elements(p_misu_items)
  loop
    v_product := (v_item ->> 'productCode')::public.product_code;
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty > 0 then
      select remaining_units into v_remaining
        from public.customer_inventory
        where customer_id = p_customer_id and product_code = v_product
        for update;
      v_remaining := coalesce(v_remaining, 0);
      if v_qty > v_remaining then
        raise exception '你的%目前只剩%包，无法记录使用%包，请检查数量或先更新回购库存。',
          case v_product when 'MISU_N_PLUS' then 'MISU N+ 代餐' else 'MISU DX+ 排毒' end,
          v_remaining, v_qty;
      end if;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(p_misu_items)
  loop
    v_product := (v_item ->> 'productCode')::public.product_code;
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty > 0 then
      update public.customer_inventory
        set total_used_units = total_used_units + v_qty,
            remaining_units = remaining_units - v_qty,
            updated_at = now()
        where customer_id = p_customer_id and product_code = v_product
        returning remaining_units into v_new_remaining;

      insert into public.inventory_transactions (customer_id, product_code, type, quantity_change, balance_after, related_record_id, note, created_by)
        values (p_customer_id, v_product, 'MEAL_USAGE', -v_qty, v_new_remaining, p_meal_id::text, 'Smart Meal Check 记录使用', 'customer');

      perform public._check_and_update_alert(p_customer_id, v_product, v_new_remaining);
    end if;
  end loop;

  insert into public.meals (id, customer_id, meal_type, misu_items, food_items, name, meal_time, photo_emoji, portion, calories, protein, carbs, fat, fiber, misu_score, good_points, improve_points, ai_advice)
    values (p_meal_id, p_customer_id, p_meal_type, p_misu_items, p_food_items, p_name, p_meal_time, p_photo_emoji, p_portion, p_calories, p_protein, p_carbs, p_fat, p_fiber, p_misu_score, p_good_points, p_improve_points, p_ai_advice);

  return jsonb_build_object('ok', true, 'alreadyRecorded', false);
end;
$$;

revoke execute on function public.record_meal(uuid, uuid, text, jsonb, jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text[], text[], text) from public;
grant execute on function public.record_meal(uuid, uuid, text, jsonb, jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text[], text[], text) to authenticated;
