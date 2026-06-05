-- Jakub Olša OpenClaw CRM schema draft
-- Date: 2026-06-03
-- Target: Supabase Postgres
--
-- V1 assumes server-side access through Cloudflare Worker/OpenClaw tools.
-- RLS is enabled without broad anon policies so browser clients cannot read CRM data by default.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  owner_user_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  telegram_id text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_owner_user_id_fkey'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_owner_user_id_fkey
      foreign key (owner_user_id) references public.users(id)
      deferrable initially deferred;
  end if;
end;
$$;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  source text,
  notes_summary text,
  raw_payload jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  intent text not null default 'unknown',
  status text not null default 'new',
  location text,
  location_place_id text,
  property_type text,
  budget text,
  time_horizon text,
  source text,
  qualification_score integer,
  next_follow_up_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_status_check check (status in ('new', 'qualified', 'contacted', 'meeting', 'won', 'lost', 'archived')),
  constraint leads_intent_check check (intent in ('sell', 'buy', 'rent', 'consult', 'estimate', 'unknown'))
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  title text not null,
  slug text,
  listing_type text not null default 'offered',
  status text not null default 'draft',
  address text,
  location text,
  price_text text,
  transaction_price numeric(14, 2),
  description text,
  short_note text,
  source_text text,
  created_from text,
  published_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_listing_type_check check (listing_type in ('offered', 'sold_reference')),
  constraint properties_status_check check (status in ('draft', 'review', 'published', 'archived'))
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  status text not null default 'open',
  price_text text,
  commission_text text,
  closed_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_status_check check (status in ('open', 'negotiation', 'won', 'lost', 'archived'))
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  google_event_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'requested',
  qualification_payload jsonb not null default '{}'::jsonb,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_status_check check (status in ('requested', 'confirmed', 'cancelled', 'rescheduled', 'no_show'))
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  author_type text not null default 'system',
  body text not null,
  source text,
  created_at timestamptz not null default now(),
  constraint notes_entity_type_check check (entity_type in ('contact', 'lead', 'property', 'deal', 'appointment', 'task')),
  constraint notes_author_type_check check (author_type in ('jakub', 'agent', 'adam', 'system'))
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  title text not null,
  status text not null default 'open',
  due_at timestamptz,
  assigned_to uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check check (status in ('open', 'done', 'cancelled'))
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  storage_path text not null,
  original_filename text,
  media_type text not null default 'image',
  sort_order integer not null default 0,
  caption text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint media_type_check check (media_type in ('image', 'video', 'document', 'audio', 'other'))
);

create table if not exists public.agent_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agent_id text not null,
  run_id text,
  action text not null,
  summary text,
  status text not null default 'started',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint agent_logs_status_check check (status in ('started', 'succeeded', 'failed', 'waiting_for_approval'))
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_type text not null,
  actor_id text,
  action text not null,
  entity_type text,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_actor_type_check check (actor_type in ('jakub', 'adam', 'agent', 'system'))
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  requested_by_agent_id text not null,
  action_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  approved_by text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint approval_requests_status_check check (status in ('pending', 'approved', 'rejected', 'expired'))
);

create table if not exists public.admin_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  severity text not null default 'medium',
  title text not null,
  description text,
  failed_run_id text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint admin_cases_severity_check check (severity in ('low', 'medium', 'high', 'critical')),
  constraint admin_cases_status_check check (status in ('open', 'investigating', 'resolved'))
);

create table if not exists public.calendar_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null default 'google',
  calendar_id text,
  sync_started_at timestamptz not null default now(),
  sync_finished_at timestamptz,
  busy_payload jsonb not null default '{}'::jsonb
);

create index if not exists contacts_tenant_phone_idx on public.contacts (tenant_id, phone) where deleted_at is null;
create index if not exists contacts_tenant_email_idx on public.contacts (tenant_id, email) where deleted_at is null;
create index if not exists leads_tenant_status_idx on public.leads (tenant_id, status) where deleted_at is null;
create index if not exists leads_tenant_created_at_idx on public.leads (tenant_id, created_at desc);
create index if not exists properties_tenant_status_idx on public.properties (tenant_id, status) where deleted_at is null;
create index if not exists appointments_tenant_starts_at_idx on public.appointments (tenant_id, starts_at desc);
create index if not exists appointments_google_event_id_idx on public.appointments (google_event_id) where google_event_id is not null;
create index if not exists tasks_tenant_due_at_idx on public.tasks (tenant_id, due_at) where status = 'open';
create index if not exists agent_logs_tenant_created_at_idx on public.agent_logs (tenant_id, created_at desc);
create index if not exists audit_logs_tenant_created_at_idx on public.audit_logs (tenant_id, created_at desc);
create index if not exists approval_requests_tenant_status_idx on public.approval_requests (tenant_id, status);
create index if not exists admin_cases_tenant_status_idx on public.admin_cases (tenant_id, status);

drop trigger if exists users_set_updated_at on public.users;
drop trigger if exists contacts_set_updated_at on public.contacts;
drop trigger if exists leads_set_updated_at on public.leads;
drop trigger if exists properties_set_updated_at on public.properties;
drop trigger if exists deals_set_updated_at on public.deals;
drop trigger if exists appointments_set_updated_at on public.appointments;
drop trigger if exists tasks_set_updated_at on public.tasks;

create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger contacts_set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();
create trigger deals_set_updated_at before update on public.deals
  for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.tenant_users enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.properties enable row level security;
alter table public.deals enable row level security;
alter table public.appointments enable row level security;
alter table public.notes enable row level security;
alter table public.tasks enable row level security;
alter table public.media enable row level security;
alter table public.agent_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.approval_requests enable row level security;
alter table public.admin_cases enable row level security;
alter table public.calendar_snapshots enable row level security;

-- Bootstrap after review:
-- insert into public.tenants (slug, name) values ('jakub-olsa', 'Jakub Olša')
-- on conflict (slug) do nothing;
