-- ═══════════════════════════════════════════════════════════════════════════
-- Hidden Discovery — Phase 3: sync the JSON Registry into the DB catalogue.
-- GENERATED from config/hidden-discovery-registry.json v1.2.0.
-- The DB catalogue becomes a projection of the Registry (single source of truth).
-- Old placeholder catalogue (12) is replaced; audited 0 real unlocks, so the
-- cascade that clears ephemeral clues/hints is safe.
-- ═══════════════════════════════════════════════════════════════════════════

-- Clear the old catalogue (cascades old hints + ephemeral clues).
delete from public.discovery_achievements;

insert into public.discovery_achievements
  (code, name, icon, description, category, rarity, trigger_type, trigger_condition,
   celebration_type, unlock_scope, hint_advance_days, discovery_priority, enabled, registry_version) values
  ('today-ahead', '今天领先', '🌅', '你第一次早早地把今天走完了 —— 原来主动一点，一整天都更从容。', 'early', 'common', 'first_time', '{"source":"daily_complete"}'::jsonb, 'surprise', 'lifetime', 7, 12, true, '1.1.0'),
  ('early-bird', '早起鸟', '🐦', '天刚亮，你就已经记录了自己 —— 早起的人，先遇见了最安静的世界。', 'early', 'rare', 'calendar_condition', '{"source":"weighin","before":"07:00","count":1}'::jsonb, 'surprise', 'lifetime', 9, 14, true, '1.1.0'),
  ('watertight', '滴水不漏', '🌊', '连续七天，一天都没落下 —— 喝水这件小事，你做得滴水不漏。', 'water', 'rare', 'consecutive_days', '{"source":"water","days":7}'::jsonb, 'proud', 'lifetime', 10, 32, true, '1.1.0'),
  ('hundredth-cup', '第一百杯', '💧', '第一百次喝够了水 —— 一百天的温柔，都藏在这一杯里。', 'water', 'epic', 'accumulated_count', '{"source":"water","count":100}'::jsonb, 'celebration', 'lifetime', 12, 62, true, '1.1.0'),
  ('early-finish', '提前收工', '⏰', '太阳还没落，你已经喝够了今天的水 —— 提前收工，剩下的时间都是轻松。', 'water', 'rare', 'calendar_condition', '{"source":"water","before":"18:00","count":1}'::jsonb, 'surprise', 'lifetime', 10, 34, false, '1.1.0'),
  ('good-chooser', '会挑的人', '🍽️', '你第一次搭出了均衡的一餐 —— 会挑的人，把健康吃成了享受。', 'food', 'common', 'first_time', '{"source":"meal_balanced"}'::jsonb, 'surprise', 'lifetime', 8, 24, false, '1.1.0'),
  ('no-missed-meal', '没有漏餐', '🍚', '一连好几天，一餐都没有落下 —— 好好吃饭，是你对自己的认真。', 'food', 'rare', 'consecutive_days', '{"source":"meal","days":5}'::jsonb, 'proud', 'lifetime', 10, 36, false, '1.1.0'),
  ('after-hundred-meals', '百餐之后', '🍱', '记录了一百餐之后，你更懂得怎么喂饱自己 —— 也更懂得，怎么爱自己。', 'food', 'epic', 'accumulated_count', '{"source":"meal","count":100}'::jsonb, 'celebration', 'lifetime', 12, 64, false, '1.1.0'),
  ('today-not-tomorrow', '今天不留到明天', '🌙', '今天的事，今天就想明白了 —— 不留到明天，是一种温柔的果断。', 'reflection', 'common', 'first_time', '{"source":"reflection"}'::jsonb, 'proud', 'lifetime', 8, 26, false, '1.1.0'),
  ('rhythm-returns', '节奏回来了', '🔄', '停了一阵子，你又回来了 —— 节奏回来了，一切都还来得及。', 'reflection', 'rare', 'comeback', '{"minGapDays":7,"returnDays":3}'::jsonb, 'proud', 'lifetime', 12, 40, false, '1.1.0'),
  ('sunday-too', '星期天也来了', '🗓️', '连星期天，你也来了 —— 在别人休息的日子，你依然记得自己。', 'calendar', 'rare', 'calendar_condition', '{"source":"daily_complete","weekday":"sunday","count":1}'::jsonb, 'surprise', 'lifetime', 10, 42, false, '1.1.0'),
  ('phase-one-complete', '第一阶段完成', '🎯', '你亲手定下的第一个阶段，完成了 —— 说到做到，本身就值得庆祝。', 'achievement', 'epic', 'goal_achievement', '{"goal":"phase_1"}'::jsonb, 'celebration', 'lifetime', 12, 66, false, '1.1.0'),
  ('phase-two-complete', '第二阶段完成', '🎯', '第二个阶段也完成了 —— 你正在把「坚持」变成一种习惯。', 'achievement', 'epic', 'goal_achievement', '{"goal":"phase_2"}'::jsonb, 'celebration', 'lifetime', 12, 67, false, '1.1.0'),
  ('breakthrough-5kg', '突破5kg', '🌱', '五公斤的改变，是你一次次坚持换来的 —— 数字背后，是看不见的努力。', 'achievement', 'rare', 'weight_delta', '{"kg":5}'::jsonb, 'proud', 'lifetime', 14, 68, false, '1.1.0'),
  ('breakthrough-7kg', '突破7kg', '🌿', '七公斤 —— 你没有走捷径，只是每天都比昨天多认真了一点。', 'achievement', 'epic', 'weight_delta', '{"kg":7}'::jsonb, 'proud', 'lifetime', 14, 69, false, '1.1.0'),
  ('breakthrough-10kg', '突破10kg', '🌳', '十公斤的距离，是无数个平凡日子堆出来的 —— 了不起，是你自己做到的。', 'achievement', 'legendary', 'weight_delta', '{"kg":10}'::jsonb, 'celebration', 'lifetime', 14, 70, false, '1.1.0'),
  ('journey-kickstart', '启程之证', '🏁', '你走完了 Kickstart Journey —— 最难的「开始」，你已经跨过。', 'achievement', 'epic', 'journey_completion', '{"scope":"journey","which":"kickstart"}'::jsonb, 'celebration', 'lifetime', 12, 72, false, '1.1.0'),
  ('journey-momentum', '渐入佳境', '🏁', 'Momentum Journey 完成 —— 你已经不只是在坚持，而是在享受节奏。', 'achievement', 'legendary', 'journey_completion', '{"scope":"journey","which":"momentum"}'::jsonb, 'celebration', 'lifetime', 12, 73, false, '1.1.0'),
  ('journey-transformation', '焕然一新', '🏆', 'Transformation Journey 完成 —— 九十天，你把自己活成了另一个样子。', 'achievement', 'legendary', 'journey_completion', '{"scope":"journey","which":"transformation"}'::jsonb, 'celebration', 'lifetime', 12, 74, false, '1.1.0'),
  ('next-chapter-two', '开启第二阶段', '🚪', '你选择了开启下一段 —— 满足于现在很好，但你想要更多。', 'achievement', 'rare', 'custom', '{"rule":"start_next_chapter","params":{"chapter":2}}'::jsonb, 'celebration', 'lifetime', 12, 50, false, '1.1.0'),
  ('set-off-again', '再次启程', '🧭', '你又一次踏上了新的旅程 —— 愿意重新出发的人，最勇敢。', 'achievement', 'epic', 'custom', '{"rule":"start_new_journey","params":{}}'::jsonb, 'proud', 'lifetime', 12, 52, false, '1.1.0'),
  ('hundred-mornings', '百次晨光', '🌄', '一百个清晨，你都认真面对了镜中的自己 —— 这份坦诚，很珍贵。', 'milestone', 'epic', 'accumulated_count', '{"source":"weighin","count":100}'::jsonb, 'celebration', 'lifetime', 12, 60, true, '1.1.0'),
  ('hundred-healthy-meals', '百次好好吃饭', '🥗', '一百次好好吃饭 —— 你把「健康」吃成了本能。', 'milestone', 'epic', 'accumulated_count', '{"source":"meal_balanced","count":100}'::jsonb, 'celebration', 'lifetime', 12, 61, false, '1.1.0');

-- Hints (evolving clue text) for every discovery.
insert into public.discovery_hints (achievement_id, stage, hint_text)
select a.id, v.stage, v.hint from public.discovery_achievements a
join (values
  ('today-ahead', 1, '和「今天」有关。'),
  ('today-ahead', 2, '早一点，就不一样。'),
  ('early-bird', 1, '和清晨有关。'),
  ('early-bird', 2, '太阳升起之前……'),
  ('watertight', 1, '需要一点坚持。'),
  ('watertight', 2, '和水，也和「不间断」有关。'),
  ('hundredth-cup', 1, '和水有关。'),
  ('hundredth-cup', 2, '日积月累，才见分晓。'),
  ('early-finish', 1, '和水有关。'),
  ('early-finish', 2, '在一天结束之前……'),
  ('good-chooser', 1, '和吃有关。'),
  ('good-chooser', 2, '第一次，就挑得刚刚好。'),
  ('no-missed-meal', 1, '和吃饭有关。'),
  ('no-missed-meal', 2, '一餐都别落下。'),
  ('after-hundred-meals', 1, '和吃有关。'),
  ('after-hundred-meals', 2, '一餐一餐，累积成百。'),
  ('today-not-tomorrow', 1, '和「今天」有关。'),
  ('today-not-tomorrow', 2, '别把它留到明天。'),
  ('rhythm-returns', 1, '和「回来」有关。'),
  ('rhythm-returns', 2, '停下之后，重新开始。'),
  ('sunday-too', 1, '和某一天有关。'),
  ('sunday-too', 2, '别人休息的那天……'),
  ('phase-one-complete', 1, '和你定下的目标有关。'),
  ('phase-one-complete', 2, '第一步，走完了。'),
  ('phase-two-complete', 1, '和你定下的目标有关。'),
  ('phase-two-complete', 2, '又完成了一个。'),
  ('breakthrough-5kg', 1, '和你的坚持有关。'),
  ('breakthrough-5kg', 2, '一点一点的改变，累积起来了。'),
  ('breakthrough-7kg', 1, '和你的坚持有关。'),
  ('breakthrough-7kg', 2, '又向前了一步。'),
  ('breakthrough-10kg', 1, '和你的坚持有关。'),
  ('breakthrough-10kg', 2, '一段很长的路，快走完了。'),
  ('journey-kickstart', 1, '和你的旅程有关。'),
  ('journey-kickstart', 2, '第一段路，走完了。'),
  ('journey-momentum', 1, '和你的旅程有关。'),
  ('journey-momentum', 2, '越走，越稳。'),
  ('journey-transformation', 1, '和你的旅程有关。'),
  ('journey-transformation', 2, '最长的那一段。'),
  ('next-chapter-two', 1, '和「下一段」有关。'),
  ('next-chapter-two', 2, '一段结束，另一段开始。'),
  ('set-off-again', 1, '和「再一次」有关。'),
  ('set-off-again', 2, '重新出发。'),
  ('hundred-mornings', 1, '和清晨、和记录有关。'),
  ('hundred-mornings', 2, '一百次面对自己。'),
  ('hundred-healthy-meals', 1, '和吃有关。'),
  ('hundred-healthy-meals', 2, '一百次的好好吃饭。')
) as v(code, stage, hint) on v.code = a.code;

