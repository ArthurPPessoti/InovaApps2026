create schema if not exists private;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  company_profile text not null check (company_profile in ('technology', 'general')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'analyst', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_id text not null,
  name text not null check (char_length(name) between 1 and 200),
  segment text,
  lifecycle_status text not null default 'active' check (lifecycle_status in ('active', 'attention', 'cancelled')),
  owner_user_id uuid references auth.users(id) on delete set null,
  monthly_revenue numeric(14, 2) not null default 0 check (monthly_revenue >= 0),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, external_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  family text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.customer_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  plan text,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  strategic_criticality smallint not null default 3 check (strategic_criticality between 1 and 5),
  active_users integer not null default 0 check (active_users >= 0),
  monthly_revenue numeric(14, 2) not null default 0 check (monthly_revenue >= 0),
  started_at date,
  renewal_at date,
  cancelled_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, customer_id, product_id)
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('spreadsheet', 'tracking', 'crm', 'support', 'financial', 'nps')),
  status text not null default 'pending' check (status in ('pending', 'active', 'error', 'disabled')),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  file_name text not null,
  storage_path text,
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'uploaded' check (status in ('uploaded', 'validating', 'processing', 'completed', 'failed')),
  row_count integer check (row_count is null or row_count >= 0),
  schema_report jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.analysis_template_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  version integer not null check (version > 0),
  target_definition jsonb not null,
  feature_mapping jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, name, version)
);

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  import_id uuid references public.imports(id) on delete set null,
  template_version_id uuid references public.analysis_template_versions(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  as_of_date date,
  summary jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.analysis_metric_results (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  subject_type text not null check (subject_type in ('organization', 'customer', 'customer_product')),
  subject_id uuid not null,
  metric_key text not null,
  metric_value numeric,
  metric_text text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (analysis_run_id, subject_type, subject_id, metric_key)
);

create table public.churn_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  subject_type text not null check (subject_type in ('customer', 'customer_product')),
  horizon_days integer not null check (horizon_days between 7 and 365),
  positive_outcome jsonb not null,
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.model_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  churn_definition_id uuid not null references public.churn_definitions(id) on delete cascade,
  version text not null,
  algorithm text not null,
  stage text not null check (stage in ('draft', 'pilot', 'production', 'retired')),
  trained_until date not null,
  independent_positive_events integer not null check (independent_positive_events >= 0),
  feature_contract jsonb not null,
  metrics jsonb not null,
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  artifact_path text,
  created_at timestamptz not null default now(),
  unique (organization_id, churn_definition_id, version)
);

create table public.prediction_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  model_version_id uuid not null references public.model_versions(id) on delete restrict,
  import_id uuid references public.imports(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  as_of_date date not null,
  horizon_days integer not null check (horizon_days between 7 and 365),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.churn_predictions (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prediction_run_id uuid not null references public.prediction_runs(id) on delete cascade,
  subject_type text not null check (subject_type in ('customer', 'customer_product')),
  subject_id uuid not null,
  probability numeric(7, 6) not null check (probability between 0 and 1),
  probability_band text not null check (probability_band in ('low', 'attention', 'high', 'critical')),
  expected_monthly_revenue_at_risk numeric(14, 2) not null default 0 check (expected_monthly_revenue_at_risk >= 0),
  data_coverage numeric(7, 6) check (data_coverage between 0 and 1),
  top_factors jsonb not null default '[]'::jsonb check (jsonb_typeof(top_factors) = 'array'),
  created_at timestamptz not null default now(),
  unique (prediction_run_id, subject_type, subject_id)
);

create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_type text not null check (job_type in ('import', 'analysis', 'train', 'predict')),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organization_members_user_idx on public.organization_members (user_id, organization_id);
create index customers_org_status_idx on public.customers (organization_id, lifecycle_status);
create index customers_owner_idx on public.customers (organization_id, owner_user_id) where owner_user_id is not null;
create index products_org_idx on public.products (organization_id);
create index customer_products_customer_idx on public.customer_products (organization_id, customer_id);
create index customer_products_product_idx on public.customer_products (organization_id, product_id);
create index data_sources_org_idx on public.data_sources (organization_id);
create index imports_source_idx on public.imports (organization_id, data_source_id, created_at desc);
create index analysis_templates_org_idx on public.analysis_template_versions (organization_id);
create index analysis_runs_org_idx on public.analysis_runs (organization_id, created_at desc);
create index metric_results_subject_idx on public.analysis_metric_results (organization_id, subject_type, subject_id);
create index churn_definitions_org_idx on public.churn_definitions (organization_id);
create index model_versions_definition_idx on public.model_versions (organization_id, churn_definition_id);
create index prediction_runs_model_idx on public.prediction_runs (organization_id, model_version_id, created_at desc);
create index churn_predictions_subject_idx on public.churn_predictions (organization_id, subject_type, subject_id);
create index churn_predictions_priority_idx on public.churn_predictions (organization_id, prediction_run_id, expected_monthly_revenue_at_risk desc);
create index analysis_jobs_pending_idx on public.analysis_jobs (available_at, created_at) where status = 'pending';
create index audit_logs_org_time_idx on public.audit_logs (organization_id, created_at desc);

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_org_role(target_organization_id uuid, accepted_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.role = any (accepted_roles)
  );
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_touch before update on public.organizations for each row execute function private.touch_updated_at();
create trigger customers_touch before update on public.customers for each row execute function private.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function private.touch_updated_at();
create trigger customer_products_touch before update on public.customer_products for each row execute function private.touch_updated_at();
create trigger data_sources_touch before update on public.data_sources for each row execute function private.touch_updated_at();
create trigger churn_definitions_touch before update on public.churn_definitions for each row execute function private.touch_updated_at();
create trigger analysis_jobs_touch before update on public.analysis_jobs for each row execute function private.touch_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.customer_products enable row level security;
alter table public.data_sources enable row level security;
alter table public.imports enable row level security;
alter table public.analysis_template_versions enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.analysis_metric_results enable row level security;
alter table public.churn_definitions enable row level security;
alter table public.model_versions enable row level security;
alter table public.prediction_runs enable row level security;
alter table public.churn_predictions enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.audit_logs enable row level security;

create policy organizations_select on public.organizations for select to authenticated using ((select private.is_org_member(id)));
create policy organizations_insert on public.organizations for insert to authenticated with check (created_by = (select auth.uid()));
create policy organizations_update on public.organizations for update to authenticated using ((select private.has_org_role(id, array['owner', 'admin']))) with check ((select private.has_org_role(id, array['owner', 'admin'])));

create policy organization_members_select on public.organization_members for select to authenticated using ((select private.is_org_member(organization_id)));
create policy organization_members_insert on public.organization_members for insert to authenticated with check (
  (select private.has_org_role(organization_id, array['owner', 'admin']))
  or (user_id = (select auth.uid()) and role = 'owner' and exists (
    select 1 from public.organizations organization
    where organization.id = organization_id and organization.created_by = (select auth.uid())
  ))
);
create policy organization_members_update on public.organization_members for update to authenticated using ((select private.has_org_role(organization_id, array['owner', 'admin']))) with check ((select private.has_org_role(organization_id, array['owner', 'admin'])));
create policy organization_members_delete on public.organization_members for delete to authenticated using ((select private.has_org_role(organization_id, array['owner', 'admin'])) and user_id <> (select auth.uid()));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers', 'products', 'customer_products', 'data_sources', 'imports',
    'analysis_runs', 'analysis_metric_results', 'churn_definitions', 'model_versions',
    'prediction_runs', 'churn_predictions'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_org_member(organization_id)))',
      table_name || '_select', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.has_org_role(organization_id, array[''owner'', ''admin'', ''analyst''])))',
      table_name || '_insert', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.has_org_role(organization_id, array[''owner'', ''admin'', ''analyst'']))) with check ((select private.has_org_role(organization_id, array[''owner'', ''admin'', ''analyst''])))',
      table_name || '_update', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.has_org_role(organization_id, array[''owner'', ''admin''])))',
      table_name || '_delete', table_name
    );
  end loop;
end $$;

create policy templates_select on public.analysis_template_versions for select to authenticated using (organization_id is null or (select private.is_org_member(organization_id)));
create policy templates_write on public.analysis_template_versions for all to authenticated using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin', 'analyst']))) with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin', 'analyst'])));

create policy jobs_select on public.analysis_jobs for select to authenticated using ((select private.is_org_member(organization_id)));
create policy jobs_insert on public.analysis_jobs for insert to authenticated with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'analyst'])));
create policy audit_select on public.audit_logs for select to authenticated using ((select private.has_org_role(organization_id, array['owner', 'admin'])));
create policy audit_insert on public.audit_logs for insert to authenticated with check ((select private.is_org_member(organization_id)) and actor_user_id = (select auth.uid()));

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.organizations, public.organization_members, public.customers, public.products, public.customer_products, public.data_sources, public.imports, public.analysis_template_versions, public.analysis_runs, public.analysis_metric_results, public.churn_definitions, public.model_versions, public.prediction_runs, public.churn_predictions, public.analysis_jobs, public.audit_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid), private.has_org_role(uuid, text[]) to authenticated;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inovaapps-imports',
  'inovaapps-imports',
  false,
  52428800,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy import_files_select on storage.objects for select to authenticated using (
  bucket_id = 'inovaapps-imports'
  and (select private.is_org_member(((storage.foldername(name))[1])::uuid))
);
create policy import_files_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'inovaapps-imports'
  and (select private.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'analyst']))
);
create policy import_files_update on storage.objects for update to authenticated using (
  bucket_id = 'inovaapps-imports'
  and (select private.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'analyst']))
) with check (
  bucket_id = 'inovaapps-imports'
  and (select private.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'analyst']))
);
create policy import_files_delete on storage.objects for delete to authenticated using (
  bucket_id = 'inovaapps-imports'
  and (select private.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin']))
);
