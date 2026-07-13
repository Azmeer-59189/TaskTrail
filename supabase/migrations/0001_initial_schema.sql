-- Initial TaskTrail schema draft.
-- This migration is intentionally explicit so RLS policies can be added clearly.

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create type public.member_role as enum ('admin', 'manager', 'worker');
create type public.member_status as enum ('active', 'invited', 'disabled');
create type public.job_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.job_status as enum (
  'draft',
  'scheduled',
  'assigned',
  'in_progress',
  'blocked',
  'completed',
  'reviewed',
  'cancelled'
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'worker',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (workspace_id, profile_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  address text not null,
  latitude double precision,
  longitude double precision,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  site_id uuid not null references public.sites(id),
  title text not null,
  description text,
  priority public.job_priority not null default 'normal',
  status public.job_status not null default 'draft',
  scheduled_date date not null,
  time_window_start time,
  time_window_end time,
  assigned_to uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  completed_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.job_checklist_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  label text not null,
  is_required boolean not null default true,
  is_completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0
);

create table if not exists public.job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  event_type text not null,
  message text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_path text not null,
  caption text,
  photo_type text not null default 'other',
  created_at timestamptz not null default now()
);

create table if not exists public.job_notes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.job_signatures (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  signed_by_name text not null,
  signature_storage_path text not null,
  created_at timestamptz not null default now()
);
