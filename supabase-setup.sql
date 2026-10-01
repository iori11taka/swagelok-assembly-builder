-- Ejecutar una sola vez en Supabase > SQL Editor.
create table if not exists public.assembly_projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  notes text not null default '',
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assembly_projects_user_updated_idx on public.assembly_projects(user_id, updated_at desc);
alter table public.assembly_projects enable row level security;
drop policy if exists "Users read own assembly projects" on public.assembly_projects;
drop policy if exists "Users insert own assembly projects" on public.assembly_projects;
drop policy if exists "Users update own assembly projects" on public.assembly_projects;
drop policy if exists "Users delete own assembly projects" on public.assembly_projects;
create policy "Users read own assembly projects" on public.assembly_projects for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own assembly projects" on public.assembly_projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own assembly projects" on public.assembly_projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own assembly projects" on public.assembly_projects for delete to authenticated using ((select auth.uid()) = user_id);
