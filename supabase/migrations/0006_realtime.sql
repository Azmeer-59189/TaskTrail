-- Phase 5: publish delivery-work changes to connected dashboard and mobile clients.
-- RLS remains the authorization boundary for all realtime subscriptions.

do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array[
    'jobs', 'projects', 'job_checklist_items', 'task_updates', 'job_events'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', realtime_table);
    end if;
  end loop;
end;
$$;
