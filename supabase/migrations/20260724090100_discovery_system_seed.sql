-- ── Trigger types (extensible; the engine dispatches on `key`) ──────────────
insert into public.discovery_trigger_types (key, description) values
  ('cumulative_count', 'Total count of a source event reaches N'),
  ('first_time',       'The first time a source event happens'),
  ('streak_days',      'N consecutive days of a source event'),
  ('time_of_day',      'A source event within a time-of-day window, N times'),
  ('calendar_date',    'An event on a specific calendar date (MM-DD)'),
  ('habit_level',      'A habit reaches a given cumulative threshold')
on conflict (key) do nothing;

-- ── Engine settings (all tunable without code) ──────────────────────────────
insert into public.discovery_settings (key, value, description) values
  ('clue_target',      '6',  'How many active clue slots each user keeps'),
  ('stale_days',       '15', 'Days without meaningful progress before rotating one clue'),
  ('reveal_gap_hours', '6',  'Minimum hours between two discovery reveals (drip)')
on conflict (key) do nothing;

-- ── Meaningful-progress signals (configurable) ──────────────────────────────
insert into public.discovery_progress_signals (key, description, enabled) values
  ('discovery_unlock', 'Unlocking any discovery', true),
  ('journey_reward',   'Earning any Journey reward (points event)', true),
  ('daily_complete',   'Completing the full daily Journey', true)
on conflict (key) do nothing;

-- ── Sample discoveries (~12; content is placeholder, framework is the point) ─
insert into public.discovery_achievements
  (code, name, icon, description, category, rarity, trigger_type, trigger_condition, hint_advance_days, discovery_priority, enabled) values
  ('first_water',           '初次畅饮', '💧', '你第一次喝够了一天的水 —— 一切美好，都从第一口开始。', 'water',       'common',    'first_time',      '{"source":"water"}',                          7,  10, true),
  ('water_streak_7',        '水的节奏', '🌊', '连续七天喝够水，你已经把 hydration 变成了身体的节奏。', 'patience',    'rare',      'streak_days',     '{"source":"water","days":7}',                 10, 40, true),
  ('water_30',              '水之信徒', '💧', '累计三十天喝够水，你对身体的温柔从不间断。',               'water',       'rare',      'cumulative_count','{"source":"water","n":30}',                   12, 60, true),
  ('morning_weigh_5',       '清晨旅人', '🌅', '在五个清晨记录了自己 —— 你遇见了一天中最安静的时刻。',     'morning',     'rare',      'time_of_day',     '{"source":"weighin","before":"07:00","count":5}', 9, 30, true),
  ('weigh_streak_14',       '沉稳之镜', '⚖️', '连续十四天面对镜中的自己，不焦虑，只是看见努力。',         'patience',    'rare',      'streak_days',     '{"source":"weighin","days":14}',              12, 55, true),
  ('learning_10',           '好奇的心', '📚', '完成十次学习 —— 你正一点一点，更懂自己的身体。',           'learning',    'common',    'cumulative_count','{"source":"learning","n":10}',                10, 50, true),
  ('consistency_7',         '韵律初成', '🔥', '完整地度过七天 Journey，自律正在成为习惯。',               'consistency', 'common',    'cumulative_count','{"source":"daily_complete","n":7}',           8,  20, true),
  ('consistency_streak_10', '未曾间断', '🔁', '连续十天，一天都没有落下 —— 这份坚持，很了不起。',         'patience',    'legendary', 'streak_days',     '{"source":"daily_complete","days":10}',       14, 80, true),
  ('n_plus_20',             '滋养仪式', '🍵', '二十次 MISU N+ 打卡，营养已经成为你的日常仪式。',           'nutrition',   'common',    'cumulative_count','{"source":"n_plus","n":20}',                  10, 45, true),
  ('dx_plus_20',            '轻盈仪式', '🌿', '二十次 MISU DX+ 打卡，你懂得给身体留白。',                 'detox',       'common',    'cumulative_count','{"source":"dx_plus","n":20}',                 10, 45, true),
  ('newyear_glow',          '新年之光', '🎆', '在新的一年第一天照顾自己 —— 愿这束光，照亮整年。',         'special',     'legendary', 'calendar_date',   '{"mmdd":"01-01"}',                            12, 15, true),
  ('travel_explorer',       '远行者',   '✈️', '在旅途中，也没有忘记照顾自己。（即将开启）',               'special',     'legendary', 'cumulative_count','{"source":"travel","n":1}',                   12, 90, false)
on conflict (code) do nothing;

-- ── Hints (vague → less vague; never the exact condition) ───────────────────
insert into public.discovery_hints (achievement_id, stage, hint_text)
select a.id, v.stage, v.hint from public.discovery_achievements a
join (values
  ('first_water', 1, '与水有关。'),
  ('first_water', 2, '第一次，就有意义。'),
  ('water_streak_7', 1, '需要一点耐心。'),
  ('water_streak_7', 2, '和水，也和坚持有关。'),
  ('water_streak_7', 3, '别让它断在中途。'),
  ('water_30', 1, '与水有关。'),
  ('water_30', 2, '日积月累，才见分晓。'),
  ('morning_weigh_5', 1, '与清晨有关。'),
  ('morning_weigh_5', 2, '当太阳升起时……'),
  ('morning_weigh_5', 3, '早起的人，会先遇见它。'),
  ('weigh_streak_14', 1, '需要耐心。'),
  ('weigh_streak_14', 2, '与镜子里的自己有关。'),
  ('learning_10', 1, '与好奇心有关。'),
  ('learning_10', 2, '一点一点地懂。'),
  ('consistency_7', 1, '与坚持有关。'),
  ('consistency_7', 2, '完整地，度过一些日子。'),
  ('consistency_streak_10', 1, '极需耐心。'),
  ('consistency_streak_10', 2, '一天，都不能少。'),
  ('n_plus_20', 1, '与日常的滋养有关。'),
  ('dx_plus_20', 1, '与轻盈有关。'),
  ('newyear_glow', 1, '只在特别的日子出现。'),
  ('newyear_glow', 2, '当一年开始的时候……'),
  ('travel_explorer', 1, '与远方有关。')
) as v(code, stage, hint) on v.code = a.code
on conflict (achievement_id, stage) do nothing;
