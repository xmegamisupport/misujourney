-- ═══════════════════════════════════════════════════════════════════════════
-- Hidden Discovery — MYSTERY MODE. Undiscovered discoveries are no longer shown
-- as icon + name (too easy to guess). They become true mysteries: a masked badge
-- (❔ ????????) with ONE daily-rotating curiosity hint that never reveals the
-- unlock condition, name, or icon.
--
--   • mystery_hints: a jsonb array of curiosity strings per discovery (synced
--     from config/hidden-discovery-registry.json — the source of truth).
--   • get_my_discovery_gallery() now returns, for each undiscovered mystery, ONLY
--     an opaque per-day id + one rotating hint. No code, name, icon, or category
--     ever leaves the server for an undiscovered discovery — the client cannot
--     leak what it never receives.
--
-- Both the mystery PICK (which ≤5 show today) and the hint PICK (which one line)
-- are deterministic per (user, day): stable if reopened today, fresh tomorrow.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.discovery_achievements
  add column if not exists mystery_hints jsonb not null default '[]'::jsonb;

-- Sync curiosity hints from the Registry (v1.4.0). Curiosity, never a spoiler.
update public.discovery_achievements a
set mystery_hints = v.hints
from (values
  ('today-ahead',           '["有些人，天一亮就已经在路上了。","这一天还没来得及催你，你就先动身了。","抢在世界之前，已经有人出发。"]'::jsonb),
  ('early-bird',            '["有人总在世界醒来之前，就已经完成了什么。","清晨最安静的那一刻，藏着一个秘密。","天光未亮，却已经有人开始。"]'::jsonb),
  ('watertight',           '["有些习惯，会在没人察觉的时候，悄悄改变你。","日复一日，从不间断——这本身就是一种温柔。","坚持到某个程度，它就不再需要努力。"]'::jsonb),
  ('hundredth-cup',        '["有些数字，要很久很久以后才会出现。","一次微不足道，很多次之后，就是另一回事了。","点点滴滴，终会汇成一件了不起的事。"]'::jsonb),
  ('early-finish',         '["太阳还没落，有人就已经轻松下来。","把该做的提前做完，是一种奢侈的自由。"]'::jsonb),
  ('good-chooser',         '["第一次做对一件事的感觉，总是格外清晰。","有人似乎天生懂得，怎么对自己好一点。"]'::jsonb),
  ('no-missed-meal',       '["认真的人，连小事都不肯将就。","一天都没有落下，需要一点温柔的固执。"]'::jsonb),
  ('after-hundred-meals',  '["重复很多很多次之后，人会变得不一样。","有些改变，要到很久以后才看得见。"]'::jsonb),
  ('today-not-tomorrow',   '["有人从不把今天的事，留到明天。","在一天结束之前，把它好好收起来。"]'::jsonb),
  ('rhythm-returns',       '["离开过的人，回来时脚步格外坚定。","停下，从来不代表结束。"]'::jsonb),
  ('sunday-too',           '["别人休息的那天，总有人还记得自己。","有些日子里的坚持，格外珍贵。"]'::jsonb),
  ('phase-one-complete',   '["说到做到的人，会先兑现给自己。","你亲手定下的那件事，正在等一个结果。"]'::jsonb),
  ('phase-two-complete',   '["走过一次的路，第二次会更笃定。","坚持，正在悄悄变成习惯。"]'::jsonb),
  ('breakthrough-5kg',     '["有些改变，是无数个平凡日子换来的。","看得见的变化背后，藏着看不见的努力。"]'::jsonb),
  ('breakthrough-7kg',     '["不走捷径的人，才走得最稳。","每天比昨天多认真一点，就会走到这里。"]'::jsonb),
  ('breakthrough-10kg',    '["很长很长的一段路，总有人默默走完。","了不起的事，往往是一天天堆出来的。"]'::jsonb),
  ('journey-kickstart',    '["最难的从来是开始，而有人已经跨过。","第一段路的尽头，藏着一枚印记。"]'::jsonb),
  ('journey-momentum',     '["走着走着，有人就不再只是坚持，而是享受。","越往前，越轻盈。"]'::jsonb),
  ('journey-transformation','["最长的那段路走完时，人已经不一样了。","有人用很长的时间，把自己活成了另一个模样。"]'::jsonb),
  ('next-chapter-two',     '["满足于此已经很好，但有人想要更多。","一扇门合上，另一扇正被推开。"]'::jsonb),
  ('set-off-again',        '["愿意重新出发的人，最勇敢。","有人一次又一次，从头开始。"]'::jsonb),
  ('hundred-mornings',     '["有人愿意一次又一次，诚实地面对自己。","很多个清晨累积起来，会成为一件了不起的事。","重复了很多很多次之后的清晨，会有光。"]'::jsonb),
  ('hundred-healthy-meals','["把「对自己好」重复一百次，会发生什么？","有些本能，是一次次选择，慢慢养成的。"]'::jsonb)
) as v(code, hints)
where a.code = v.code;

-- ── Gallery RPC: discovered (full) ++ daily-rotating masked mysteries ─────────
create or replace function public.get_my_discovery_gallery()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select coalesce(auth.uid()::text, '') as uid, current_date::text as day)
  select
    -- Everything the user has discovered: full moment, newest first.
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'discovered', true,
        'code', a.code, 'name', a.name, 'icon', a.icon,
        'category', a.category, 'message', a.description,
        'discoveredAt', ud.revealed_at
      ) order by ud.revealed_at desc)
      from public.discovery_achievements a
      join public.user_discoveries ud
        on ud.achievement_id = a.id and ud.user_id = auth.uid() and ud.revealed_at is not null
      where a.enabled
    ), '[]'::jsonb)
    ||
    -- A daily-rotating handful of mysteries: opaque id + one rotating hint ONLY.
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'discovered', false,
        'mysteryId', md5(p.code || (select uid from me) || (select day from me)),
        'hint', p.hint
      ) order by p.ord)
      from (
        select
          a.code,
          md5(a.code || (select uid from me) || (select day from me)) as ord,
          coalesce(
            (select h.val
             from jsonb_array_elements_text(a.mystery_hints) as h(val)
             order by md5(h.val || a.code || (select uid from me) || (select day from me))
             limit 1),
            '这个时刻，还在你的旅程里，等着某一天与你相遇。'
          ) as hint
        from public.discovery_achievements a
        where a.enabled
          and not exists (
            select 1 from public.user_discoveries ud
            where ud.achievement_id = a.id and ud.user_id = auth.uid() and ud.revealed_at is not null
          )
        order by md5(a.code || (select uid from me) || (select day from me))
        limit 5
      ) p
    ), '[]'::jsonb);
$$;
revoke execute on function public.get_my_discovery_gallery() from public, anon;
grant execute on function public.get_my_discovery_gallery() to authenticated;
