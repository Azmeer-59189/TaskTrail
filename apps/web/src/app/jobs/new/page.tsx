import Link from "next/link";
import { AppShell, Notice } from "../../../components/app-shell";
import { requireWorkspaceContext } from "../../../lib/current-context";
import { createJob } from "../../actions/operations";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const { supabase, workspace } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const [{ data: projects }, { data: members }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, code")
      .eq("workspace_id", workspace.id)
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("workspace_members")
      .select(
        "profile_id, role, profile:profiles!workspace_members_profile_id_fkey(full_name)",
      )
      .eq("workspace_id", workspace.id)
      .eq("status", "active"),
  ]);

  return (
    <AppShell currentPath="/jobs" workspaceName={workspace.name}>
      <header className="mb-6">
        <Link className="text-sm font-medium text-field" href="/jobs">
          ← Tasks
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Create task</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Plan development work and assign it to a team member.
        </p>
      </header>
      <Notice>{searchParams.error}</Notice>
      {!projects?.length ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Create a project before adding a task.{" "}
          <Link className="font-bold underline" href="/projects">
            Open Projects
          </Link>
        </div>
      ) : (
        <form
          action={createJob}
          className="grid gap-5 rounded border border-zinc-200 bg-white p-6 md:grid-cols-2"
        >
          <Field
            label="Task title"
            name="title"
            placeholder="Implement password reset flow"
          />
          <label className="text-sm font-medium text-zinc-700">
            Project
            <select
              className="mt-1.5 h-11 w-full rounded border border-zinc-300 bg-white px-3"
              name="projectId"
              required
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} — {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Task type
            <select
              className="mt-1.5 h-11 w-full rounded border border-zinc-300 bg-white px-3"
              defaultValue="feature"
              name="taskType"
            >
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="improvement">Improvement</option>
              <option value="research">Research</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Priority
            <select
              className="mt-1.5 h-11 w-full rounded border border-zinc-300 bg-white px-3"
              defaultValue="normal"
              name="priority"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <Field label="Due date" name="scheduledDate" type="date" />
          <Field
            label="Estimate (hours)"
            name="estimatedHours"
            required={false}
            type="number"
            min="0"
            step="0.25"
            placeholder="8"
          />
          <label className="text-sm font-medium text-zinc-700">
            Assign to
            <select
              className="mt-1.5 h-11 w-full rounded border border-zinc-300 bg-white px-3"
              name="assignedTo"
            >
              <option value="">Unassigned</option>
              {(members ?? [])
                .filter((member) => member.role === "worker")
                .map((member) => {
                  const profile = Array.isArray(member.profile)
                    ? member.profile[0]
                    : member.profile;
                  return (
                    <option key={member.profile_id} value={member.profile_id}>
                      {profile?.full_name ?? "Team member"}
                    </option>
                  );
                })}
            </select>
          </label>
          <Field
            label="GitHub issue or PR"
            name="githubUrl"
            placeholder="https://github.com/org/repo/issues/123"
            required={false}
          />
          <label className="text-sm font-medium text-zinc-700 md:col-span-2">
            Description
            <textarea
              className="mt-1.5 min-h-28 w-full rounded border border-zinc-300 p-3"
              name="description"
              placeholder="Acceptance criteria, technical context, and expected outcome"
            />
          </label>
          <label className="text-sm font-medium text-zinc-700 md:col-span-2">
            Subtasks{" "}
            <span className="font-normal text-zinc-400">(one per line)</span>
            <textarea
              className="mt-1.5 min-h-28 w-full rounded border border-zinc-300 p-3"
              name="checklist"
              placeholder={
                "Add API endpoint\nBuild form UI\nAdd validation\nWrite tests"
              }
            />
          </label>
          <button className="h-11 rounded bg-field px-4 text-sm font-semibold text-white md:col-span-2">
            Create and assign task
          </button>
        </form>
      )}
    </AppShell>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required = true,
  min,
  step,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <label className="text-sm font-medium text-zinc-700">
      {label}
      <input
        className="mt-1.5 h-11 w-full rounded border border-zinc-300 px-3"
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
      />
    </label>
  );
}
