import Link from "next/link";
import { AppShell, Notice } from "../../components/app-shell";
import { requireWorkspaceContext } from "../../lib/current-context";
import { normalizeExternalUrl } from "../../lib/urls";
import { createProject } from "../actions/operations";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const { supabase, workspace } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      "id, name, code, description, repository_url, is_archived, tasks:jobs(id)",
    )
    .eq("workspace_id", workspace.id)
    .order("name");

  return (
    <AppShell currentPath="/projects" workspaceName={workspace.name}>
      <header className="mb-6">
        <p className="text-sm font-semibold text-field">Development</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Projects</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Group tasks by product, client engagement, or internal initiative.
        </p>
      </header>
      <Notice>{searchParams.error ?? error?.message}</Notice>
      <Notice type="success">{searchParams.success}</Notice>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <form
          action={createProject}
          className="h-fit space-y-4 rounded border border-zinc-200 bg-white p-6"
        >
          <h2 className="font-semibold text-ink">Create project</h2>
          <Field
            label="Project name"
            name="name"
            placeholder="Customer Portal"
          />
          <Field label="Project code" name="code" placeholder="PORTAL" />
          <Field
            label="Repository URL"
            name="repositoryUrl"
            placeholder="https://github.com/company/repository"
            required={false}
          />
          <label className="block text-sm font-medium text-zinc-700">
            Description
            <textarea
              className="mt-1.5 min-h-24 w-full rounded border border-zinc-300 p-3"
              name="description"
            />
          </label>
          <button className="h-11 w-full rounded bg-field px-4 text-sm font-semibold text-white">
            Create project
          </button>
        </form>
        <div className="grid gap-4 md:grid-cols-2">
          {(projects ?? []).map((project) => (
            <article
              className="rounded border border-zinc-200 bg-white p-5"
              key={project.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-field">
                    {project.code}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">
                    {project.name}
                  </h2>
                </div>
                <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                  {project.tasks?.length ?? 0} tasks
                </span>
              </div>
              <p className="mt-3 min-h-10 text-sm leading-5 text-zinc-500">
                {project.description ?? "No project description yet."}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                {normalizeExternalUrl(project.repository_url) ? (
                  <a
                    className="truncate text-xs font-semibold text-field"
                    href={normalizeExternalUrl(project.repository_url)!}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Repository ↗
                  </a>
                ) : (
                  <span className="text-xs text-zinc-400">
                    No repository linked
                  </span>
                )}
                <Link
                  className="text-xs font-semibold text-ink"
                  href="/jobs/new"
                >
                  Add task →
                </Link>
              </div>
            </article>
          ))}
          {!projects?.length && (
            <div className="rounded border border-dashed border-zinc-300 p-10 text-center md:col-span-2">
              <p className="font-semibold text-ink">No projects yet</p>
              <p className="mt-1 text-sm text-zinc-500">
                Create your first software project using the form.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  name,
  placeholder,
  required = true,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-700">
      {label}
      <input
        className="mt-1.5 h-11 w-full rounded border border-zinc-300 px-3"
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}
