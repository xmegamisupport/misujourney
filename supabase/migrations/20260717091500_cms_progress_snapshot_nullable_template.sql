-- Bug found via live testing: complete_today_content() snapshots
-- template_type into cms_customer_content_progress.template_type_snapshot,
-- which was NOT NULL — but poster_upload content has no template_type at
-- all, so completing a poster failed with a NOT NULL violation. The column
-- is a point-in-time snapshot (same idea as content_title_snapshot), not a
-- required field, so it just needs to allow null for that mode.
alter table public.cms_customer_content_progress
  alter column template_type_snapshot drop not null;
