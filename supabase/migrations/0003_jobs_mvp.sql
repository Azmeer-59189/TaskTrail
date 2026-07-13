-- Phase 3: controlled worker job transitions and event history.

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
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  actor_profile_id := public.current_profile_id();

  select * into current_job
  from public.jobs
  where id = target_job_id
  for update;

  if current_job.id is null then
    raise exception 'Job not found';
  end if;

  if current_job.assigned_to is distinct from actor_profile_id then
    raise exception 'This job is not assigned to you';
  end if;

  if not public.is_workspace_member(current_job.workspace_id) then
    raise exception 'Workspace access denied';
  end if;

  if not (
    (current_job.status in ('scheduled', 'assigned', 'blocked') and next_status = 'in_progress')
    or (current_job.status = 'in_progress' and next_status in ('blocked', 'completed'))
  ) then
    raise exception 'Invalid job status transition from % to %', current_job.status, next_status;
  end if;

  update public.jobs
  set
    status = next_status,
    completed_at = case when next_status = 'completed' then now() else completed_at end
  where id = target_job_id
  returning * into current_job;

  insert into public.job_events (job_id, profile_id, event_type, message)
  values (
    target_job_id,
    actor_profile_id,
    'status_changed',
    'Status changed to ' || replace(next_status::text, '_', ' ')
  );

  return current_job;
end;
$$;

revoke all on function public.transition_assigned_job(uuid, public.job_status) from public;
grant execute on function public.transition_assigned_job(uuid, public.job_status) to authenticated;
