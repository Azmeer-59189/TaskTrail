-- Phase 6: private in-app notifications for delivery work.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (notification_type in ('task_assigned', 'task_status', 'task_update'))
);

create index if not exists notifications_profile_created_at_idx
  on public.notifications (profile_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (profile_id = public.current_profile_id());
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

create or replace function public.create_job_notification(
  target_workspace_id uuid,
  target_profile_id uuid,
  target_job_id uuid,
  kind text,
  notification_title text,
  notification_body text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (
    workspace_id, profile_id, job_id, notification_type, title, body
  ) values (
    target_workspace_id, target_profile_id, target_job_id, kind,
    notification_title, notification_body
  );
end;
$$;

create or replace function public.notify_on_job_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  recipient record;
  actor_id uuid;
begin
  actor_id := public.current_profile_id();

  if tg_op = 'INSERT' and new.assigned_to is not null then
    perform public.create_job_notification(
      new.workspace_id, new.assigned_to, new.id, 'task_assigned',
      'New task assigned', new.title || ' is ready for you.'
    );
  elsif tg_op = 'UPDATE' and new.assigned_to is distinct from old.assigned_to
    and new.assigned_to is not null then
    perform public.create_job_notification(
      new.workspace_id, new.assigned_to, new.id, 'task_assigned',
      'Task assigned to you', new.title || ' has been assigned to you.'
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    for recipient in
      select profile_id from public.workspace_members
      where workspace_id = new.workspace_id
        and status = 'active'
        and role in ('admin', 'manager')
        and profile_id is distinct from actor_id
    loop
      perform public.create_job_notification(
        new.workspace_id, recipient.profile_id, new.id, 'task_status',
        'Task status changed', new.title || ' moved to ' || replace(new.status::text, '_', ' ') || '.'
      );
    end loop;
  end if;
  return new;
end;
$$;

create or replace function public.notify_on_task_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  task_record public.jobs;
  recipient record;
begin
  select * into task_record from public.jobs where id = new.job_id;
  for recipient in
    select profile_id from public.workspace_members
    where workspace_id = task_record.workspace_id
      and status = 'active'
      and role in ('admin', 'manager')
      and profile_id is distinct from new.profile_id
  loop
    perform public.create_job_notification(
      task_record.workspace_id, recipient.profile_id, task_record.id, 'task_update',
      'New developer update', task_record.title || ': ' || left(new.body, 120)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists jobs_create_notifications on public.jobs;
create trigger jobs_create_notifications
  after insert or update of assigned_to, status on public.jobs
  for each row execute function public.notify_on_job_change();

drop trigger if exists task_updates_create_notifications on public.task_updates;
create trigger task_updates_create_notifications
  after insert on public.task_updates
  for each row execute function public.notify_on_task_update();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

revoke all on function public.create_job_notification(uuid, uuid, uuid, text, text, text) from public;
