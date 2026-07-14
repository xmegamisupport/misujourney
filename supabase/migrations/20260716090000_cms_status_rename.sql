-- Rename in its own migration/transaction, same caution as the ADD VALUE
-- migrations elsewhere in this project, even though RENAME VALUE doesn't
-- have the same same-transaction restriction — keeping the pattern
-- consistent avoids having to remember which ALTER TYPE variants are safe.
alter type public.cms_content_status rename value 'rejected' to 'needs_revision';
