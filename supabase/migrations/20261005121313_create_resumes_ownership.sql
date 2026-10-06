-- ISSUE-002: builder documents, independent of CRM and saved-analysis schemas.
begin;

create table public.resumes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  data jsonb not null,
  template_id text not null,
  updated_at timestamptz not null default statement_timestamp(),
  constraint resumes_data_object check (jsonb_typeof(data) = 'object')
);

create index resumes_owner_updated_at_idx
  on public.resumes (user_id, updated_at desc);

-- Invoker trigger only: no privileged CRUD or caller-controlled timestamps.
create function public.resumes_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function public.resumes_set_updated_at()
  from public, anon, authenticated, service_role;

create trigger resumes_set_updated_at
  before insert or update on public.resumes
  for each row execute function public.resumes_set_updated_at();

alter table public.resumes enable row level security;

-- Remove default privileges as well as PUBLIC inheritance before granting CRUD.
revoke all on table public.resumes from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.resumes to authenticated;

create policy resumes_owner_select on public.resumes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy resumes_owner_insert on public.resumes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy resumes_owner_update on public.resumes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy resumes_owner_delete on public.resumes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
