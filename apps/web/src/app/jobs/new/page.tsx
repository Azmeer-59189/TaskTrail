import Link from "next/link";
import { AppShell, Notice } from "../../../components/app-shell";
import { requireWorkspaceContext } from "../../../lib/current-context";
import { createJob } from "../../actions/operations";

export const dynamic = "force-dynamic";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const { supabase, workspace } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const [{ data: customers }, { data: sites }, { data: members }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name")
        .eq("workspace_id", workspace.id)
        .order("name"),
      supabase
        .from("sites")
        .select("id, name, customer_id, address")
        .eq("workspace_id", workspace.id)
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
          ← Jobs
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Create job</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Schedule work and assign it to a mobile worker.
        </p>
      </header>
      <Notice>{searchParams.error}</Notice>
      {!customers?.length || !sites?.length ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Add at least one customer and service site before creating a job.{" "}
          <Link className="font-bold underline" href="/customers">
            Open Customers
          </Link>
        </div>
      ) : (
        <form
          action={createJob}
          className="grid gap-5 rounded border border-zinc-200 bg-white p-6 md:grid-cols-2"
        >
          <Field
            label="Job title"
            name="title"
            placeholder="Generator inspection"
          />
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
          <label className="text-sm font-medium text-zinc-700">
            Customer
            <select
              className="mt-1.5 h-11 w-full rounded border border-zinc-300 bg-white px-3"
              name="customerId"
              required
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Service site
            <select
              className="mt-1.5 h-11 w-full rounded border border-zinc-300 bg-white px-3"
              name="siteId"
              required
            >
              <option value="">Select site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} — {site.address}
                </option>
              ))}
            </select>
          </label>
          <Field label="Scheduled date" name="scheduledDate" type="date" />
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
                      {profile?.full_name ?? "Worker"}
                    </option>
                  );
                })}
            </select>
          </label>
          <Field
            label="Start time"
            name="timeStart"
            required={false}
            type="time"
          />
          <Field label="End time" name="timeEnd" required={false} type="time" />
          <label className="text-sm font-medium text-zinc-700 md:col-span-2">
            Description
            <textarea
              className="mt-1.5 min-h-24 w-full rounded border border-zinc-300 p-3"
              name="description"
            />
          </label>
          <label className="text-sm font-medium text-zinc-700 md:col-span-2">
            Checklist{" "}
            <span className="font-normal text-zinc-400">
              (one item per line)
            </span>
            <textarea
              className="mt-1.5 min-h-28 w-full rounded border border-zinc-300 p-3"
              name="checklist"
              placeholder={
                "Inspect equipment\nRecord meter reading\nTake completion photo"
              }
            />
          </label>
          <button className="h-11 rounded bg-field px-4 text-sm font-semibold text-white md:col-span-2">
            Create and assign job
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
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-zinc-700">
      {label}
      <input
        className="mt-1.5 h-11 w-full rounded border border-zinc-300 px-3"
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}
