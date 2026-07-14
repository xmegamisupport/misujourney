-- ---------- Knowledge CMS: new roles ----------
-- Split into its own migration: ALTER TYPE ... ADD VALUE cannot be used in
-- the same transaction as a later command that references the new value,
-- so the tables/functions that use 'nutritionist'/'trainer' go in a
-- follow-up migration.
alter type public.user_role add value 'nutritionist';
alter type public.user_role add value 'trainer';
