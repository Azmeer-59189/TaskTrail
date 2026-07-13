import { formatJobStatus, type JobStatus } from "@tasktrail/shared";
import Link from "next/link";
import { AppShell, Notice } from "../../../components/app-shell";
import { requireWorkspaceContext } from "../../../lib/current-context";

export const dynamic = "force-dynamic";

export default async function JobDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, workspace } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const { data: job, error } = await supabase
    .from("jobs")
    .select(
      "id, title, description, scheduled_date, time_window_start, time_window_end, status, priority, customer:customers(name), site:sites(name, address), assignee:profiles!jobs_assigned_to_fkey(full_name), checklist:job_checklist_items(id, label, is_required, is_completed, completed_at, sort_order), events:job_events(id, event_type, message, created_at, actor:profiles!job_events_profile_id_fkey(full_name))",
    )
    .eq("workspace_id", workspace.id)
    .eq("id", params.id)
    .order("sort_order", {
      referencedTable: "job_checklist_items",
      ascending: true,
    })
    .order("created_at", { referencedTable: "job_events", ascending: false })
    .maybeSingle();

  if (!job) {
    return (
      <AppShell currentPath="/jobs" workspaceName={workspace.name}>
        <Link className="text-sm font-medium text-field" href="/jobs">
          ← Jobs
        </Link>
        <Notice>
          {error?.message ?? "Job not found or you do not have access to it."}
        </Notice>
      </AppShell>
    );
  }

  const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer;
  const site = Array.isArray(job.site) ? job.site[0] : job.site;
  const assignee = Array.isArray(job.assignee) ? job.assignee[0] : job.assignee;
  const checklist = job.checklist ?? [];
  const completedItems = checklist.filter((item) => item.is_completed).length;
  const checklistPercent = checklist.length
    ? Math.round((completedItems / checklist.length) * 100)
    : 0;

  return (
    <AppShell currentPath="/jobs" workspaceName={workspace.name}>
      <header className="mb-6">
        <Link className="text-sm font-medium text-field" href="/jobs">
          ← Jobs
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-ink">{job.title}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {customer?.name} · {site?.name}
            </p>
          </div>
          <span className="rounded bg-zinc-100 px-3 py-1.5 text-xs font-bold uppercase text-zinc-700">
            {formatJobStatus(job.status as JobStatus)}
          </span>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded border border-zinc-200 bg-white p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">
                Checklist progress
              </p>
              <p className="mt-1 text-3xl font-semibold text-ink">
                {completedItems}{" "}
                <span className="text-lg font-normal text-zinc-400">
                  of {checklist.length}
                </span>
              </p>
            </div>
            <p className="text-sm font-bold text-emerald-700">
              {checklistPercent}%
            </p>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${checklistPercent}%` }}
            />
          </div>
          <div className="mt-6 divide-y divide-zinc-100 border-y border-zinc-100">
            {checklist.map((item) => (
              <div className="flex items-start gap-3 py-3" key={item.id}>
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.is_completed ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"}`}
                >
                  {item.is_completed ? "✓" : ""}
                </span>
                <div>
                  <p
                    className={
                      item.is_completed
                        ? "text-sm text-zinc-500 line-through"
                        : "text-sm font-medium text-ink"
                    }
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {item.is_completed && item.completed_at
                      ? `Completed ${formatDateTime(item.completed_at)}`
                      : item.is_required
                        ? "Required"
                        : "Optional"}
                  </p>
                </div>
              </div>
            ))}
            {!checklist.length && (
              <p className="py-8 text-center text-sm text-zinc-500">
                No checklist was added to this job.
              </p>
            )}
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold text-ink">Job information</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Detail
                label="Worker"
                value={assignee?.full_name ?? "Unassigned"}
              />
              <Detail label="Date" value={job.scheduled_date} />
              <Detail
                label="Time"
                value={formatTimeWindow(
                  job.time_window_start,
                  job.time_window_end,
                )}
              />
              <Detail label="Priority" value={job.priority} />
              <Detail label="Address" value={site?.address ?? "—"} />
            </dl>
            {job.description && (
              <p className="mt-5 border-t border-zinc-100 pt-4 text-sm leading-6 text-zinc-600">
                {job.description}
              </p>
            )}
          </section>
          <section className="rounded border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold text-ink">Activity</h2>
            <div className="mt-4 space-y-4">
              {(job.events ?? []).map((event) => {
                const actor = Array.isArray(event.actor)
                  ? event.actor[0]
                  : event.actor;
                return (
                  <div
                    className="border-l-2 border-zinc-200 pl-3"
                    key={event.id}
                  >
                    <p className="text-sm font-medium text-ink">
                      {event.message ?? event.event_type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {actor?.full_name ?? "System"} ·{" "}
                      {formatDateTime(event.created_at)}
                    </p>
                  </div>
                );
              })}
              {!job.events?.length && (
                <p className="text-sm text-zinc-500">
                  No activity recorded yet.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium capitalize text-ink">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTimeWindow(start: string | null, end: string | null) {
  if (!start && !end) return "Any time";
  return [start?.slice(0, 5), end?.slice(0, 5)].filter(Boolean).join(" – ");
}
