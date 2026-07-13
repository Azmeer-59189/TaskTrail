import { formatJobStatus, type JobStatus } from "@tasktrail/shared";
import Link from "next/link";
import { AppShell, Notice } from "../../../components/app-shell";
import { requireWorkspaceContext } from "../../../lib/current-context";
import { normalizeExternalUrl } from "../../../lib/urls";

export const dynamic = "force-dynamic";

export default async function TaskDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, workspace } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const { data: task, error } = await supabase
    .from("jobs")
    .select(
      "id, title, description, scheduled_date, status, priority, task_type, estimated_hours, logged_hours, github_url, blocker_reason, project:projects(name, code, repository_url), assignee:profiles!jobs_assigned_to_fkey(full_name), checklist:job_checklist_items(id, label, is_required, is_completed, completed_at, sort_order), updates:task_updates(id, update_type, body, hours_logged, created_at, author:profiles!task_updates_profile_id_fkey(full_name)), events:job_events(id, event_type, message, created_at, actor:profiles!job_events_profile_id_fkey(full_name))",
    )
    .eq("workspace_id", workspace.id)
    .eq("id", params.id)
    .order("sort_order", {
      referencedTable: "job_checklist_items",
      ascending: true,
    })
    .order("created_at", { referencedTable: "task_updates", ascending: false })
    .order("created_at", { referencedTable: "job_events", ascending: false })
    .maybeSingle();

  if (!task)
    return (
      <AppShell currentPath="/jobs" workspaceName={workspace.name}>
        <Link className="text-sm font-medium text-field" href="/jobs">
          ← Tasks
        </Link>
        <Notice>
          {error?.message ?? "Task not found or you do not have access to it."}
        </Notice>
      </AppShell>
    );

  const project = Array.isArray(task.project) ? task.project[0] : task.project;
  const assignee = Array.isArray(task.assignee)
    ? task.assignee[0]
    : task.assignee;
  const checklist = task.checklist ?? [];
  const completedItems = checklist.filter((item) => item.is_completed).length;
  const checklistPercent = checklist.length
    ? Math.round((completedItems / checklist.length) * 100)
    : 0;
  const estimated =
    task.estimated_hours == null ? null : Number(task.estimated_hours);
  const logged = Number(task.logged_hours ?? 0);
  const timePercent = estimated
    ? Math.min(100, Math.round((logged / estimated) * 100))
    : 0;

  return (
    <AppShell currentPath="/jobs" workspaceName={workspace.name}>
      <header className="mb-6">
        <Link className="text-sm font-medium text-field" href="/jobs">
          ← Tasks
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-field">
              {project?.code} · {task.task_type}
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">
              {task.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{project?.name}</p>
          </div>
          <span className="rounded bg-zinc-100 px-3 py-1.5 text-xs font-bold uppercase text-zinc-700">
            {formatJobStatus(task.status as JobStatus)}
          </span>
        </div>
      </header>
      {task.blocker_reason && (
        <div className="mb-6 rounded border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold uppercase text-red-700">
            Current blocker
          </p>
          <p className="mt-1 text-sm text-red-900">{task.blocker_reason}</p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded border border-zinc-200 bg-white p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Subtask progress
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
            <Progress value={checklistPercent} />
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
                  No subtasks were added.
                </p>
              )}
            </div>
          </section>
          <section className="rounded border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold text-ink">Developer updates</h2>
            <div className="mt-4 space-y-4">
              {(task.updates ?? []).map((update) => {
                const author = Array.isArray(update.author)
                  ? update.author[0]
                  : update.author;
                return (
                  <div
                    className="rounded border border-zinc-100 bg-zinc-50 p-4"
                    key={update.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold uppercase ${update.update_type === "blocker" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                      >
                        {update.update_type}
                      </span>
                      {Number(update.hours_logged) > 0 && (
                        <span className="text-xs font-semibold text-zinc-500">
                          +{Number(update.hours_logged)}h
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-700">
                      {update.body}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {author?.full_name ?? "Team member"} ·{" "}
                      {formatDateTime(update.created_at)}
                    </p>
                  </div>
                );
              })}
              {!task.updates?.length && (
                <p className="rounded border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500">
                  No progress updates yet.
                </p>
              )}
            </div>
          </section>
        </div>
        <div className="space-y-6">
          <section className="rounded border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold text-ink">Task information</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Detail
                label="Assignee"
                value={assignee?.full_name ?? "Unassigned"}
              />
              <Detail label="Due date" value={task.scheduled_date} />
              <Detail label="Priority" value={task.priority} />
              <Detail label="Type" value={task.task_type} />
              <Detail
                label="Estimate"
                value={
                  estimated == null ? "Not estimated" : `${estimated} hours`
                }
              />
              <Detail label="Logged" value={`${logged} hours`} />
            </dl>
            <Progress value={timePercent} color="bg-blue-500" />
            {normalizeExternalUrl(task.github_url) && (
              <a
                className="mt-4 block rounded border border-zinc-200 px-3 py-2 text-center text-sm font-semibold text-field"
                href={normalizeExternalUrl(task.github_url)!}
                rel="noreferrer"
                target="_blank"
              >
                Open GitHub issue or PR ↗
              </a>
            )}
            {normalizeExternalUrl(project?.repository_url) && (
              <a
                className="mt-2 block text-center text-xs font-semibold text-zinc-500"
                href={normalizeExternalUrl(project?.repository_url)!}
                rel="noreferrer"
                target="_blank"
              >
                Project repository ↗
              </a>
            )}
            {task.description && (
              <p className="mt-5 border-t border-zinc-100 pt-4 text-sm leading-6 text-zinc-600">
                {task.description}
              </p>
            )}
          </section>
          <section className="rounded border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold text-ink">Activity</h2>
            <div className="mt-4 space-y-4">
              {(task.events ?? []).map((event) => {
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
function Progress({
  value,
  color = "bg-emerald-500",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-zinc-200">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
