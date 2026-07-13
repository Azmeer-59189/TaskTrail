-- Phase 2: connect Supabase Auth to application profiles and secure workspace data.

alter table public.profiles
  add constraint profiles_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users(id) on delete cascade;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, full_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1), 'New user')
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for auth users created before this migration.
insert into public.profiles (auth_user_id, full_name)
select
  users.id,
  coalesce(nullif(users.raw_user_meta_data ->> 'full_name', ''), split_part(users.email, '@', 1), 'User')
from auth.users as users
on conflict (auth_user_id) do nothing;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and profile_id = public.current_profile_id()
      and status = 'active'
  );
$$;

create or replace function public.has_workspace_role(
  target_workspace_id uuid,
  allowed_roles public.member_role[]
)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and profile_id = public.current_profile_id()
      and status = 'active'
      and role = any(allowed_roles)
  );
$$;

create or replace function public.shares_workspace_with(target_profile_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.profile_id = public.current_profile_id()
      and mine.status = 'active'
      and theirs.profile_id = target_profile_id
      and theirs.status = 'active'
  );
$$;

create or replace function public.create_workspace(workspace_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid;
  v_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(workspace_name), '') is null then
    raise exception 'Workspace name is required';
  end if;

  insert into public.profiles (auth_user_id, full_name)
  select
    users.id,
    coalesce(nullif(users.raw_user_meta_data ->> 'full_name', ''), split_part(users.email, '@', 1), 'User')
  from auth.users as users
  where users.id = auth.uid()
  on conflict (auth_user_id) do update set full_name = public.profiles.full_name
  returning id into v_profile_id;

  if v_profile_id is null then
    select id into v_profile_id from public.profiles where auth_user_id = auth.uid();
  end if;

  if exists (
    select 1 from public.workspace_members
    where public.workspace_members.profile_id = v_profile_id
      and status = 'active'
  ) then
    raise exception 'User already belongs to a workspace';
  end if;

  insert into public.workspaces (name, owner_id)
  values (trim(workspace_name), v_profile_id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, profile_id, role, status)
  values (v_workspace_id, v_profile_id, 'admin', 'active');

  return v_workspace_id;
end;
$$;

revoke all on function public.create_workspace(text) from public;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.member_role[]) to authenticated;
grant execute on function public.shares_workspace_with(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.customers enable row level security;
alter table public.sites enable row level security;
alter table public.jobs enable row level security;
alter table public.job_checklist_items enable row level security;
alter table public.job_events enable row level security;
alter table public.job_photos enable row level security;
alter table public.job_notes enable row level security;
alter table public.job_signatures enable row level security;

create policy "profiles_select_workspace" on public.profiles
  for select to authenticated
  using (auth_user_id = auth.uid() or public.shares_workspace_with(id));

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "workspaces_select_member" on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));

create policy "workspaces_update_admin" on public.workspaces
  for update to authenticated
  using (public.has_workspace_role(id, array['admin']::public.member_role[]))
  with check (public.has_workspace_role(id, array['admin']::public.member_role[]));

create policy "members_select_workspace" on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy "members_manage_admin" on public.workspace_members
  for all to authenticated
  using (public.has_workspace_role(workspace_id, array['admin']::public.member_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin']::public.member_role[]));

create policy "customers_select_member" on public.customers
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "customers_manage_staff" on public.customers
  for all to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'manager']::public.member_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'manager']::public.member_role[]));

create policy "sites_select_member" on public.sites
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "sites_manage_staff" on public.sites
  for all to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'manager']::public.member_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'manager']::public.member_role[]));

create policy "jobs_select_allowed" on public.jobs
  for select to authenticated
  using (
    public.has_workspace_role(workspace_id, array['admin', 'manager']::public.member_role[])
    or (public.is_workspace_member(workspace_id) and assigned_to = public.current_profile_id())
  );
create policy "jobs_manage_staff" on public.jobs
  for all to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'manager']::public.member_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'manager']::public.member_role[]));
create policy "checklist_select_job" on public.job_checklist_items
  for select to authenticated using (exists (select 1 from public.jobs where jobs.id = job_id));
create policy "checklist_manage_staff" on public.job_checklist_items
  for all to authenticated using (exists (
    select 1 from public.jobs
    where jobs.id = job_id
      and public.has_workspace_role(jobs.workspace_id, array['admin', 'manager']::public.member_role[])
  )) with check (exists (
    select 1 from public.jobs
    where jobs.id = job_id
      and public.has_workspace_role(jobs.workspace_id, array['admin', 'manager']::public.member_role[])
  ));
create policy "checklist_update_assignee" on public.job_checklist_items
  for update to authenticated using (exists (
    select 1 from public.jobs where jobs.id = job_id and jobs.assigned_to = public.current_profile_id()
  )) with check (exists (
    select 1 from public.jobs where jobs.id = job_id and jobs.assigned_to = public.current_profile_id()
  ));

create policy "events_select_job" on public.job_events
  for select to authenticated using (exists (select 1 from public.jobs where jobs.id = job_id));
create policy "events_insert_job" on public.job_events
  for insert to authenticated with check (
    profile_id = public.current_profile_id()
    and exists (select 1 from public.jobs where jobs.id = job_id)
  );

create policy "photos_select_job" on public.job_photos
  for select to authenticated using (exists (select 1 from public.jobs where jobs.id = job_id));
create policy "photos_insert_self" on public.job_photos
  for insert to authenticated with check (
    uploaded_by = public.current_profile_id()
    and exists (select 1 from public.jobs where jobs.id = job_id)
  );

create policy "notes_select_job" on public.job_notes
  for select to authenticated using (exists (select 1 from public.jobs where jobs.id = job_id));
create policy "notes_insert_self" on public.job_notes
  for insert to authenticated with check (
    profile_id = public.current_profile_id()
    and exists (select 1 from public.jobs where jobs.id = job_id)
  );

create policy "signatures_select_job" on public.job_signatures
  for select to authenticated using (exists (select 1 from public.jobs where jobs.id = job_id));
create policy "signatures_insert_job" on public.job_signatures
  for insert to authenticated with check (exists (select 1 from public.jobs where jobs.id = job_id));
