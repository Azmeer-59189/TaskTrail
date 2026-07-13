import { formatJobStatus, type JobStatus } from "@tasktrail/shared";
import Link from "next/link";
import { AppShell, Notice } from "../../components/app-shell";
import { requireWorkspaceContext } from "../../lib/current-context";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const { supabase, workspace } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id, title, scheduled_date, time_window_start, status, priority, customer:customers(name), site:sites(name), assignee:profiles!jobs_assigned_to_fkey(full_name), checklist:job_checklist_items(id, is_completed)",
    )
    .eq("workspace_id", workspace.id)
    .order("scheduled_date", { ascending: false });

  return (
    <AppShell currentPath="/jobs" workspaceName={workspace.name}>
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-field">Operations</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Jobs</h1>
        </div>
        <Link
          className="rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white"
          href="/jobs/new"
        >
          Create job
        </Link>
      </header>
      <Notice>{searchParams.error ?? error?.message}</Notice>
      <Notice type="success">{searchParams.success}</Notice>
      <div className="overflow-hidden rounded border border-zinc-200 bg-white">
        <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-bold uppercase text-zinc-500 md:grid">
          <span>Job</span>
          <span>Schedule</span>
          <span>Assignee</span>
          <span>Checklist</span>
          <span>Status</span>
          <span>Priority</span>
        </div>
        <div className="divide-y divide-zinc-100">
          {(jobs ?? []).map((job) => {
            const customer = Array.isArray(job.customer)
              ? job.customer[0]
              : job.customer;
            const site = Array.isArray(job.site) ? job.site[0] : job.site;
            const assignee = Array.isArray(job.assignee)
              ? job.assignee[0]
              : job.assignee;
            const checklist = job.checklist ?? [];
            const completedItems = checklist.filter(
              (item) => item.is_completed,
            ).length;
            const checklistPercent = checklist.length
              ? Math.round((completedItems / checklist.length) * 100)
              : 0;
            return (
              <Link
                className="grid gap-3 px-5 py-4 text-sm transition hover:bg-zinc-50 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] md:items-center"
                href={`/jobs/${job.id}`}
                key={job.id}
              >
                <div>
                  <p className="font-semibold text-ink">{job.title}</p>
                  <p className="text-zinc-500">
                    {customer?.name} · {site?.name}
                  </p>
                </div>
                <p className="text-zinc-600">
                  {job.scheduled_date}
                  {job.time_window_start
                    ? ` · ${job.time_window_start.slice(0, 5)}`
                    : ""}
                </p>
                <p className="text-zinc-600">
                  {assignee?.full_name ?? "Unassigned"}
                </p>
                <div>
                  {checklist.length ? (
                    <>
                      <p className="text-xs font-semibold text-zinc-700">
                        {completedItems} of {checklist.length} done
                      </p>
                      <div
                        aria-label={`${completedItems} of ${checklist.length} checklist items completed`}
                        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200"
                      >
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${checklistPercent}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-400">No checklist</span>
                  )}
                </div>
                <span className="w-fit rounded bg-zinc-100 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">
                  {formatJobStatus(job.status as JobStatus)}
                </span>
                <span className="text-xs font-bold uppercase text-amber-700">
                  {job.priority}
                </span>
              </Link>
            );
          })}
          {!jobs?.length && (
            <div className="px-5 py-14 text-center">
              <p className="font-semibold text-ink">No jobs yet</p>
              <p className="mt-1 text-sm text-zinc-500">
                Create a customer and site, then assign your first job.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
