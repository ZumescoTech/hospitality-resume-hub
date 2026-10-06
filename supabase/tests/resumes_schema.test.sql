-- Local-only pgTAP metadata/constraint evidence. Fixture changes roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select columns_are('public', 'resumes',
  array['id', 'user_id', 'title', 'data', 'template_id', 'updated_at']);
select col_type_is('public', 'resumes', 'id', 'uuid', 'cloud ID is UUID');
select col_is_pk('public', 'resumes', 'id', 'ID is primary key');
select col_type_is('public', 'resumes', 'user_id', 'uuid', 'owner is UUID');
select col_type_is('public', 'resumes', 'data', 'jsonb', 'document is JSONB');
select col_type_is('public', 'resumes', 'updated_at', 'timestamp with time zone', 'timestamp includes zone');
select ok((select bool_and(attnotnull) from pg_attribute
  where attrelid = 'public.resumes'::regclass and attnum > 0 and not attisdropped),
  'all six columns are non-null');
select ok((select relrowsecurity from pg_class where oid = 'public.resumes'::regclass),
  'RLS enabled');
select ok((select bool_and(not rolsuper and not rolbypassrls) from pg_roles
  where rolname in ('anon', 'authenticated')), 'client roles cannot bypass RLS');
select ok(not exists(select from pg_class c,
  lateral aclexplode(c.relacl) a where c.oid = 'public.resumes'::regclass
  and (a.grantee = 0 or (a.grantee = 'authenticated'::regrole and a.is_grantable))),
  'no PUBLIC table grants or authenticated grant options');
select ok(exists(select from pg_constraint where conrelid = 'public.resumes'::regclass
  and contype = 'f' and confrelid = 'auth.users'::regclass
  and pg_get_constraintdef(oid) like 'FOREIGN KEY (user_id) REFERENCES auth.users(id)%'),
  'owner FK references auth.users ID');
select is((select count(*)::integer from pg_policies
  where schemaname = 'public' and tablename = 'resumes'), 4, 'exactly four policies');
select ok((select bool_and(roles = array['authenticated']::name[])
  from pg_policies where schemaname = 'public' and tablename = 'resumes'),
  'all policies restricted to authenticated');
select ok((select qual is not null and with_check is not null from pg_policies
  where schemaname = 'public' and tablename = 'resumes' and cmd = 'UPDATE'),
  'UPDATE has USING and WITH CHECK');
select ok(exists(select from pg_indexes where schemaname = 'public'
  and tablename = 'resumes' and indexdef like '%(user_id, updated_at DESC)%'),
  'owner/latest index exists');
select ok((select not prosecdef and proconfig @> array['search_path=pg_catalog']
  from pg_proc where oid = 'public.resumes_set_updated_at()'::regprocedure),
  'timestamp trigger is invoker with fixed search path');
select ok(exists(select from pg_trigger where tgrelid = 'public.resumes'::regclass
  and tgfoid = 'public.resumes_set_updated_at()'::regprocedure
  and tgtype = 23 and tgenabled = 'O' and not tgisinternal),
  'timestamp trigger attached before INSERT and UPDATE for each row');
select ok(not has_function_privilege('anon', 'public.resumes_set_updated_at()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.resumes_set_updated_at()', 'EXECUTE'),
  'trigger function is not a client RPC');

-- has_*_privilege includes privileges inherited through roles and PUBLIC.
select ok(not has_table_privilege('anon', 'public.resumes', privilege),
  'anon denied ' || privilege)
from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege);
select ok(not has_any_column_privilege('anon', 'public.resumes', privilege),
  'anon has no column ' || privilege)
from unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) p(privilege);
select ok(has_table_privilege('authenticated', 'public.resumes', privilege),
  'authenticated granted ' || privilege)
from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p(privilege);
select ok(not has_table_privilege('authenticated', 'public.resumes', privilege),
  'authenticated denied ' || privilege)
from unnest(array['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege);
select ok(not has_table_privilege('service_role', 'public.resumes', privilege),
  'no service-role resume grant: ' || privilege)
from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p(privilege);

insert into auth.users (id) values ('00000000-0000-4000-8000-000000000001');
select throws_ok($$insert into public.resumes values
  ('00000000-0000-4000-8000-000000000010', null, '', '{}', 'classic', now())$$,
  '23502', null, 'null owner rejected');
select throws_ok($$insert into public.resumes values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000099', '', '{}', 'classic', now())$$,
  '23503', null, 'unknown owner rejected by FK');
select throws_ok($$insert into public.resumes values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', '', '[]', 'classic', now())$$,
  '23514', null, 'non-object JSON rejected');
select throws_ok($$insert into public.resumes values
  ('not-a-uuid', '00000000-0000-4000-8000-000000000001', '', '{}', 'classic', now())$$,
  '22P02', null, 'non-UUID cloud ID rejected');
insert into public.resumes (id, user_id, title, data, template_id, updated_at) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', '', '{}', 'classic', '2000-01-01');
select ok((select updated_at > '2000-01-01'::timestamptz from public.resumes
  where id = '00000000-0000-4000-8000-000000000010'), 'insert ignores forged timestamp');
update public.resumes set updated_at = '2000-01-01'
  where id = '00000000-0000-4000-8000-000000000010';
select ok((select updated_at > '2000-01-01'::timestamptz from public.resumes
  where id = '00000000-0000-4000-8000-000000000010'), 'update ignores forged timestamp');
delete from auth.users where id = '00000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.resumes
  where id = '00000000-0000-4000-8000-000000000010'), 0, 'account deletion cascades');

select * from finish();
rollback;
