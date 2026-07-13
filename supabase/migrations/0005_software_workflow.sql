-- Phase 4 pivot: projects and software-delivery task workflow.
-- Keep 0004 in migration history, but disable its field-service behavior.

drop policy if exists "job_proof_select_allowed" on storage.objects;
drop policy if exists "job_proof_insert_assignee" on storage.objects;
drop policy if exists "job_proof_delete_own" on storage.objects;
drop function if exists public.record_assigned_job_location(uuid, text, double precision, double precision, double precision);

alter type public.job_status add value if not exists 'code_review' before 'completed';
alter type public.job_status add value if not exists 'testing' before 'completed';

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  repository_url text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, code)
);

alter table public.jobs alter column customer_id drop not null;
alter table public.jobs alter column site_id drop not null;
alter table public.jobs add column if not exists project_id uuid references public.projects(id);
alter table public.jobs add column if not exists task_type text not null default 'feature';
alter table public.jobs add column if not exists estimated_hours numeric(8, 2);
alter table public.jobs add column if not exists logged_hours numeric(8, 2) not null default 0;
alter table public.jobs add column if not exists github_url text;
alter table public.jobs add column if not exists blocker_reason text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_task_type_check') then
    alter table public.jobs add constraint jobs_task_type_check
      check (task_type in ('feature', 'bug', 'improvement', 'research', 'maintenance'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'jobs_estimated_hours_check') then
    alter table public.jobs add constraint jobs_estimated_hours_check
      check (estimated_hours is null or estimated_hours >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'jobs_logged_hours_check') then
    alter table public.jobs add constraint jobs_logged_hours_check
      check (logged_hours >= 0);
  end if;
end;
$$;

insert into public.projects (workspace_id, name, code, description)
select id, 'General', 'GENERAL', 'Default project for existing tasks'
from public.workspaces
on conflict (workspace_id, code) do nothing;

update public.jobs
set project_id = projects.id
from public.projects
where jobs.project_id is null
  and projects.workspace_id = jobs.workspace_id
  and projects.code = 'GENERAL';

alter table public.jobs alter column project_id set not null;

create table if not exists public.task_updates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  update_type text not null default 'progress',
  body text not null,
  hours_logged numeric(8, 2) not null default 0,
  created_at timestamptz not null default now(),
  check (update_type in ('progress', 'blocker', 'comment', 'time', 'link')),
  check (hours_logged >= 0)
);

alter table public.projects enable row level security;
alter table public.task_updates enable row level security;

create policy "projects_select_member" on public.projects
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "projects_manage_staff" on public.projects
  for all to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'manager']::public.member_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'manager']::public.member_role[]));

create policy "task_updates_select_job" on public.task_updates
  for select to authenticated
  using (exists (select 1 from public.jobs where jobs.id = job_id));

create policy "task_updates_insert_allowed" on public.task_updates
  for insert to authenticated
  with check (
    profile_id = public.current_profile_id()
    and exists (select 1 from public.jobs where jobs.id = job_id)
  );

create or replace function public.transition_assigned_job(
  target_job_id uuid,
  next_status public.job_status
)
returns public.jobs
language plpgsql
security definer set search_path = public
as $$
declare
  current_job public.jobs;
  actor_profile_id uuid;
  current_status_text text;
  next_status_text text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  actor_profile_id := public.current_profile_id();

  select * into current_job from public.jobs where id = target_job_id for update;
  if current_job.id is null then raise exception 'Task not found'; end if;
  if current_job.assigned_to is distinct from actor_profile_id then raise exception 'This task is not assigned to you'; end if;
  if not public.is_workspace_member(current_job.workspace_id) then raise exception 'Workspace access denied'; end if;

  current_status_text := current_job.status::text;
  next_status_text := next_status::text;

  if not (
    (current_status_text in ('scheduled', 'assigned') and next_status_text = 'in_progress')
    or (current_status_text = 'in_progress' and next_status_text in ('blocked', 'code_review'))
    or (current_status_text = 'blocked' and next_status_text = 'in_progress')
    or (current_status_text = 'code_review' and next_status_text in ('in_progress', 'testing', 'completed'))
    or (current_status_text = 'testing' and next_status_text in ('in_progress', 'completed'))
  ) then
    raise exception 'Invalid task status transition from % to %', current_status_text, next_status_text;
  end if;

  update public.jobs set
    status = next_status,
    blocker_reason = case when next_status_text = 'in_progress' then null else blocker_reason end,
    completed_at = case when next_status_text = 'completed' then now() else completed_at end
  where id = target_job_id
  returning * into current_job;

  insert into public.job_events (job_id, profile_id, event_type, message)
  values (target_job_id, actor_profile_id, 'status_changed', 'Status changed to ' || replace(next_status_text, '_', ' '));

  return current_job;
end;
$$;

create or replace function public.add_assigned_task_update(
  target_job_id uuid,
  update_kind text,
  update_body text,
  hours_value numeric default 0,
  github_url_value text default null
)
returns public.task_updates
language plpgsql
security definer set search_path = public
as $$
declare
  current_job public.jobs;
  actor_profile_id uuid;
  created_update public.task_updates;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if update_kind not in ('progress', 'blocker', 'comment', 'time', 'link') then raise exception 'Unsupported update type'; end if;
  if nullif(trim(update_body), '') is null then raise exception 'Update text is required'; end if;
  if hours_value is null or hours_value < 0 then raise exception 'Logged hours cannot be negative'; end if;

  actor_profile_id := public.current_profile_id();
  select * into current_job from public.jobs where id = target_job_id for update;
  if current_job.id is null then raise exception 'Task not found'; end if;
  if current_job.assigned_to is distinct from actor_profile_id then raise exception 'This task is not assigned to you'; end if;
  if not public.is_workspace_member(current_job.workspace_id) then raise exception 'Workspace access denied'; end if;

  update public.jobs set
    logged_hours = logged_hours + hours_value,
    github_url = coalesce(nullif(trim(github_url_value), ''), github_url),
    blocker_reason = case when update_kind = 'blocker' then trim(update_body) else blocker_reason end,
    status = case when update_kind = 'blocker' then 'blocked'::public.job_status else status end
  where id = target_job_id;

  insert into public.task_updates (job_id, profile_id, update_type, body, hours_logged)
  values (target_job_id, actor_profile_id, update_kind, trim(update_body), hours_value)
  returning * into created_update;

  insert into public.job_events (job_id, profile_id, event_type, message)
  values (target_job_id, actor_profile_id, 'task_update', replace(update_kind, '_', ' ') || ' update added');

  return created_update;
end;
$$;

revoke all on function public.add_assigned_task_update(uuid, text, text, numeric, text) from public;
grant execute on function public.add_assigned_task_update(uuid, text, text, numeric, text) to authenticated;
