import { ClipboardCheck, MapPin, UsersRound } from "lucide-react";
import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { requireWorkspaceContext } from "../lib/current-context";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { supabase, workspace, profile, membership } =
    await requireWorkspaceContext(["admin", "manager"]);
  const [
    { count: openJobs },
    { count: activeJobs },
    { count: activeMembers },
    { data: recentJobs },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .not("status", "in", '("completed","reviewed","cancelled")'),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("status", "in_progress"),
    supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("status", "active"),
    supabase
      .from("jobs")
      .select("id, title, status, scheduled_date, priority")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <AppShell currentPath="/" workspaceName={workspace.name}>
      <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-field">{workspace.name}</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">
            Welcome, {profile.full_name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Signed in as {membership.role}
          </p>
        </div>
        <Link
          className="w-fit rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white"
          href="/jobs/new"
        >
          Create job
        </Link>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          icon={<ClipboardCheck size={20} />}
          label="Open jobs"
          value={String(openJobs ?? 0)}
        />
        <Metric
          icon={<MapPin size={20} />}
          label="In progress"
          value={String(activeJobs ?? 0)}
        />
        <Metric
          icon={<UsersRound size={20} />}
          label="Active members"
          value={String(activeMembers ?? 0)}
        />
      </div>
      <div className="mt-6 overflow-hidden rounded border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-ink">Recent jobs</h2>
            <p className="text-sm text-zinc-500">Latest scheduled field work</p>
          </div>
          <Link className="text-sm font-semibold text-field" href="/jobs">
            View all
          </Link>
        </div>
        <div className="divide-y divide-zinc-100">
          {(recentJobs ?? []).map((job) => (
            <div
              className="flex items-center justify-between gap-4 px-5 py-4"
              key={job.id}
            >
              <div>
                <p className="font-medium text-ink">{job.title}</p>
                <p className="text-xs text-zinc-500">{job.scheduled_date}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase text-field">
                  {job.status.replace("_", " ")}
                </p>
                <p className="text-xs uppercase text-zinc-400">
                  {job.priority}
                </p>
              </div>
            </div>
          ))}
          {!recentJobs?.length && (
            <div className="px-5 py-12 text-center">
              <p className="font-semibold text-ink">Ready for your first job</p>
              <p className="mt-1 text-sm text-zinc-500">
                Add a customer, site, and worker, then create an assignment.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link
                  className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium"
                  href="/customers"
                >
                  Add customer
                </Link>
                <Link
                  className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium"
                  href="/team"
                >
                  Add worker
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded bg-zinc-100 text-field">
        {icon}
      </div>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
