import { formatJobStatus, type JobStatus } from "@tasktrail/shared";
import Link from "next/link";
import { AppShell, Notice } from "../../components/app-shell";
import { requireWorkspaceContext } from "../../lib/current-context";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const { supabase, workspace } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const { data: tasks, error } = await supabase
    .from("jobs")
    .select(
      "id, title, scheduled_date, status, priority, task_type, estimated_hours, logged_hours, project:projects(name, code), assignee:profiles!jobs_assigned_to_fkey(full_name), checklist:job_checklist_items(id, is_completed)",
    )
    .eq("workspace_id", workspace.id)
    .order("scheduled_date", { ascending: true });

  return (
    <AppShell currentPath="/jobs" workspaceName={workspace.name}>
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-field">Development</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Tasks</h1>
        </div>
        <Link
          className="rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white"
          href="/jobs/new"
        >
          Create task
        </Link>
      </header>
      <Notice>{searchParams.error ?? error?.message}</Notice>
      <Notice type="success">{searchParams.success}</Notice>
      <div className="overflow-hidden rounded border border-zinc-200 bg-white">
        <div className="hidden grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr_auto] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-bold uppercase text-zinc-500 md:grid">
          <span>Task</span>
          <span>Due</span>
          <span>Assignee</span>
          <span>Subtasks</span>
          <span>Status</span>
          <span>Time</span>
        </div>
        <div className="divide-y divide-zinc-100">
          {(tasks ?? []).map((task) => {
            const project = Array.isArray(task.project)
              ? task.project[0]
              : task.project;
            const assignee = Array.isArray(task.assignee)
              ? task.assignee[0]
              : task.assignee;
            const checklist = task.checklist ?? [];
            const done = checklist.filter((item) => item.is_completed).length;
            const percent = checklist.length
              ? Math.round((done / checklist.length) * 100)
              : 0;
            return (
              <Link
                className="grid gap-3 px-5 py-4 text-sm transition hover:bg-zinc-50 md:grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr_auto] md:items-center"
                href={`/jobs/${task.id}`}
                key={task.id}
              >
                <div>
                  <p className="font-semibold text-ink">{task.title}</p>
                  <p className="text-xs text-zinc-500">
                    {project?.code ?? "PROJECT"} ·{" "}
                    <span className="capitalize">{task.task_type}</span> ·{" "}
                    <span className="uppercase">{task.priority}</span>
                  </p>
                </div>
                <p className="text-zinc-600">{task.scheduled_date}</p>
                <p className="text-zinc-600">
                  {assignee?.full_name ?? "Unassigned"}
                </p>
                <div>
                  {checklist.length ? (
                    <>
                      <p className="text-xs font-semibold text-zinc-700">
                        {done} of {checklist.length}
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-400">No subtasks</span>
                  )}
                </div>
                <span className="w-fit rounded bg-zinc-100 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">
                  {formatJobStatus(task.status as JobStatus)}
                </span>
                <span className="text-xs font-semibold text-zinc-600">
                  {Number(task.logged_hours ?? 0)}h /{" "}
                  {task.estimated_hours == null
                    ? "—"
                    : `${Number(task.estimated_hours)}h`}
                </span>
              </Link>
            );
          })}
          {!tasks?.length && (
            <div className="px-5 py-14 text-center">
              <p className="font-semibold text-ink">No tasks yet</p>
              <p className="mt-1 text-sm text-zinc-500">
                Create a project, add team members, and assign the first
                development task.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
