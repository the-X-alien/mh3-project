-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Email schedules table
create table public.email_schedules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  frequency text not null default 'daily' check (frequency in ('off', 'hourly', 'daily', 'weekly', 'monthly', 'yearly')),
  last_sent timestamptz,
  next_send timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_email_schedules_user_id on public.email_schedules(user_id);
create unique index idx_email_schedules_user_id_unique on public.email_schedules(user_id);

-- Nudges table
create table public.nudges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_email text not null,
  cli_at_nudge numeric(5,2),
  sent_at timestamptz not null default now(),
  delivered boolean not null default false
);

create index idx_nudges_user_id on public.nudges(user_id);

-- Trusted contacts table
create table public.trusted_contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_trusted_contacts_user_id on public.trusted_contacts(user_id);
create unique index idx_trusted_contacts_user_email on public.trusted_contacts(user_id, email);

-- Telemetry events table
create table public.telemetry_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cli numeric(5,2),
  event text not null,
  details jsonb,
  timestamp timestamptz not null default now()
);

create index idx_telemetry_user_id on public.telemetry_events(user_id);
create index idx_telemetry_user_timestamp on public.telemetry_events(user_id, timestamp desc);

-- CLI snapshots table
create table public.cli_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cli numeric(5,2) not null,
  task_complexity numeric(3,2),
  work_hours numeric(4,1),
  sleep_hours numeric(4,1),
  fault_codes jsonb,
  is_overloaded boolean not null default false,
  timestamp timestamptz not null default now()
);

create index idx_snapshots_user_id on public.cli_snapshots(user_id);
create index idx_snapshots_user_timestamp on public.cli_snapshots(user_id, timestamp desc);

-- Daily aggregates table
create table public.daily_aggregates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  avg_cli numeric(5,2),
  max_cli numeric(5,2),
  min_cli numeric(5,2),
  overload_count integer not null default 0,
  total_snapshots integer not null default 0,
  session_duration interval,
  created_at timestamptz not null default now()
);

create index idx_aggregates_user_date on public.daily_aggregates(user_id, date);
create unique index idx_aggregates_user_date_unique on public.daily_aggregates(user_id, date);

-- Enable Row Level Security
alter table public.email_schedules enable row level security;
alter table public.nudges enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.telemetry_events enable row level security;
alter table public.cli_snapshots enable row level security;
alter table public.daily_aggregates enable row level security;

-- RLS policies: email_schedules
create policy "users can select own email schedule"
  on public.email_schedules for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own email schedule"
  on public.email_schedules for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own email schedule"
  on public.email_schedules for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own email schedule"
  on public.email_schedules for delete
  to authenticated
  using (auth.uid() = user_id);

-- RLS policies: nudges
create policy "users can select own nudges"
  on public.nudges for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own nudges"
  on public.nudges for insert
  to authenticated
  with check (auth.uid() = user_id);

-- RLS policies: trusted_contacts
create policy "users can select own trusted contacts"
  on public.trusted_contacts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own trusted contacts"
  on public.trusted_contacts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own trusted contacts"
  on public.trusted_contacts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS policies: telemetry_events
create policy "users can select own telemetry"
  on public.telemetry_events for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own telemetry"
  on public.telemetry_events for insert
  to authenticated
  with check (auth.uid() = user_id);

-- RLS policies: cli_snapshots
create policy "users can select own snapshots"
  on public.cli_snapshots for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own snapshots"
  on public.cli_snapshots for insert
  to authenticated
  with check (auth.uid() = user_id);

-- RLS policies: daily_aggregates
create policy "users can select own aggregates"
  on public.daily_aggregates for select
  to authenticated
  using (auth.uid() = user_id);
