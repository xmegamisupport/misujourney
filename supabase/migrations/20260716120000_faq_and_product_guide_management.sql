-- FAQ Management and Product Guide Management were both 100% mock data
-- (src/lib/mock-data.ts) with no backing table — "+ 新增"/"编辑" buttons had
-- no onClick handler at all. Gives both a real table: simple draft/published
-- CRUD, no review workflow (unlike the Knowledge CMS) since Admin is the
-- only role that ever touches these.

create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_guides (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  summary text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.faq_items enable row level security;
alter table public.product_guides enable row level security;

-- Everyone (customer/coach/admin) can read published rows — this is the
-- source for /customer/learn/faq and /customer/learn/guide. Admin also sees
-- drafts, since /admin/content/faq|guide needs to show unpublished items.
create policy "faq_items_select" on public.faq_items
  for select using (status = 'published' or public.current_role() = 'admin');

create policy "faq_items_write_admin" on public.faq_items
  for insert with check (public.current_role() = 'admin');

create policy "faq_items_update_admin" on public.faq_items
  for update using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "faq_items_delete_admin" on public.faq_items
  for delete using (public.current_role() = 'admin');

create policy "product_guides_select" on public.product_guides
  for select using (status = 'published' or public.current_role() = 'admin');

create policy "product_guides_write_admin" on public.product_guides
  for insert with check (public.current_role() = 'admin');

create policy "product_guides_update_admin" on public.product_guides
  for update using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "product_guides_delete_admin" on public.product_guides
  for delete using (public.current_role() = 'admin');

revoke all on public.faq_items from anon;
revoke all on public.product_guides from anon;
