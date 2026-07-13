-- Historical field-service proof migration.
-- This was applied before the product pivot and is safely superseded by 0005.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-proof',
  'job-proof',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "job_proof_select_allowed" on storage.objects;
create policy "job_proof_select_allowed" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'job-proof'
    and exists (
      select 1
      from public.jobs
      where jobs.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "job_proof_insert_assignee" on storage.objects;
create policy "job_proof_insert_assignee" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'job-proof'
    and exists (
      select 1
      from public.jobs
      where jobs.id::text = (storage.foldername(name))[1]
        and jobs.assigned_to = public.current_profile_id()
    )
  );

drop policy if exists "job_proof_delete_own" on storage.objects;
create policy "job_proof_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'job-proof'
    and (storage.foldername(name))[2] = public.current_profile_id()::text
    and exists (
      select 1
      from public.jobs
      where jobs.id::text = (storage.foldername(name))[1]
        and jobs.assigned_to = public.current_profile_id()
    )
  );

create or replace function public.record_assigned_job_location(
  target_job_id uuid,
  event_name text,
  latitude_value double precision,
  longitude_value double precision,
  accuracy_meters double precision default null
)
returns public.job_events
language plpgsql
security definer set search_path = public
as $$
declare
  current_job public.jobs;
  actor_profile_id uuid;
  created_event public.job_events;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if event_name not in ('checked_in', 'checked_out', 'location_update') then
    raise exception 'Unsupported location event';
  end if;

  if latitude_value is null or longitude_value is null
    or latitude_value < -90 or latitude_value > 90
    or longitude_value < -180 or longitude_value > 180 then
    raise exception 'Invalid coordinates';
  end if;

  if accuracy_meters is not null and accuracy_meters < 0 then
    raise exception 'Invalid location accuracy';
  end if;

  actor_profile_id := public.current_profile_id();

  select * into current_job
  from public.jobs
  where id = target_job_id;

  if current_job.id is null then
    raise exception 'Job not found';
  end if;

  if current_job.assigned_to is distinct from actor_profile_id then
    raise exception 'This job is not assigned to you';
  end if;

  if not public.is_workspace_member(current_job.workspace_id) then
    raise exception 'Workspace access denied';
  end if;

  insert into public.job_events (
    job_id,
    profile_id,
    event_type,
    message,
    latitude,
    longitude
  ) values (
    target_job_id,
    actor_profile_id,
    event_name,
    case event_name
      when 'checked_in' then 'GPS check-in recorded'
      when 'checked_out' then 'GPS check-out recorded'
      else 'Location update recorded'
    end || case
      when accuracy_meters is not null then ' (accuracy ' || round(accuracy_meters)::text || ' m)'
      else ''
    end,
    latitude_value,
    longitude_value
  )
  returning * into created_event;

  return created_event;
end;
$$;

revoke all on function public.record_assigned_job_location(uuid, text, double precision, double precision, double precision) from public;
grant execute on function public.record_assigned_job_location(uuid, text, double precision, double precision, double precision) to authenticated;
