import { AppShell, Notice } from "../../components/app-shell";
import { requireWorkspaceContext } from "../../lib/current-context";
import { createTeamMember } from "../actions/operations";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const { supabase, workspace, membership } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const { data: members } = await supabase
    .from("workspace_members")
    .select(
      "id, role, status, profile:profiles!workspace_members_profile_id_fkey(full_name, auth_user_id)",
    )
    .eq("workspace_id", workspace.id)
    .order("created_at");

  return (
    <AppShell currentPath="/team" workspaceName={workspace.name}>
      <header className="mb-6">
        <p className="text-sm font-semibold text-field">People</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Team</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Create worker or manager accounts for this workspace.
        </p>
      </header>
      <Notice>{searchParams.error}</Notice>
      <Notice type="success">{searchParams.success}</Notice>

      {membership.role === "admin" && (
        <form
          action={createTeamMember}
          className="mb-6 grid gap-4 rounded border border-zinc-200 bg-white p-5 md:grid-cols-2"
        >
          <h2 className="md:col-span-2 text-lg font-semibold text-ink">
            Add team member
          </h2>
          <Field label="Full name" name="fullName" placeholder="Ayesha Khan" />
          <Field
            label="Email"
            name="email"
            placeholder="worker@company.com"
            type="email"
          />
          <Field
            label="Temporary password"
            name="password"
            placeholder="At least 8 characters"
            type="password"
          />
          <label className="text-sm font-medium text-zinc-700">
            Role
            <select
              className="mt-1.5 h-11 w-full rounded border border-zinc-300 bg-white px-3"
              name="role"
              defaultValue="worker"
            >
              <option value="worker">Worker</option>
              <option value="manager">Manager</option>
            </select>
          </label>
          <button className="h-11 rounded bg-ink px-4 text-sm font-semibold text-white md:col-span-2">
            Create account
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 className="font-semibold text-ink">Workspace members</h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {(members ?? []).map((member) => {
            const profile = Array.isArray(member.profile)
              ? member.profile[0]
              : member.profile;
            return (
              <div
                className="flex items-center justify-between gap-4 px-5 py-4"
                key={member.id}
              >
                <div>
                  <p className="font-medium text-ink">
                    {profile?.full_name ?? "Member"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {profile?.auth_user_id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-field">
                    {member.role}
                  </p>
                  <p className="text-xs text-zinc-400">{member.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium text-zinc-700">
      {label}
      <input
        className="mt-1.5 h-11 w-full rounded border border-zinc-300 px-3"
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
  );
}
