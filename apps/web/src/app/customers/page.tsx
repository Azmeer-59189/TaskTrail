import { AppShell, Notice } from "../../components/app-shell";
import { requireWorkspaceContext } from "../../lib/current-context";
import { createCustomer, createSite } from "../actions/operations";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const { supabase, workspace } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, contact_name, email, phone, sites(id, name, address)")
    .eq("workspace_id", workspace.id)
    .order("name");

  return (
    <AppShell currentPath="/customers" workspaceName={workspace.name}>
      <header className="mb-6">
        <p className="text-sm font-semibold text-field">Directory</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">
          Customers & sites
        </h1>
      </header>
      <Notice>{searchParams.error}</Notice>
      <Notice type="success">{searchParams.success}</Notice>
      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <form
          action={createCustomer}
          className="grid gap-4 rounded border border-zinc-200 bg-white p-5 md:grid-cols-2"
        >
          <h2 className="md:col-span-2 text-lg font-semibold text-ink">
            Add customer
          </h2>
          <Field label="Customer name" name="name" />
          <Field label="Contact name" name="contactName" required={false} />
          <Field label="Email" name="email" required={false} type="email" />
          <Field label="Phone" name="phone" required={false} />
          <button className="h-11 rounded bg-ink px-4 text-sm font-semibold text-white md:col-span-2">
            Add customer
          </button>
        </form>
        <form
          action={createSite}
          className="grid gap-4 rounded border border-zinc-200 bg-white p-5"
        >
          <h2 className="text-lg font-semibold text-ink">Add service site</h2>
          <label className="text-sm font-medium text-zinc-700">
            Customer
            <select
              className="mt-1.5 h-11 w-full rounded border border-zinc-300 bg-white px-3"
              name="customerId"
              required
            >
              <option value="">Select customer</option>
              {(customers ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="Site name" name="siteName" />
          <Field label="Address" name="address" />
          <button className="h-11 rounded bg-field px-4 text-sm font-semibold text-white">
            Add site
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(customers ?? []).map((customer) => (
          <article
            className="rounded border border-zinc-200 bg-white p-5"
            key={customer.id}
          >
            <h2 className="font-semibold text-ink">{customer.name}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {customer.contact_name || "No contact"}
              {customer.phone ? ` · ${customer.phone}` : ""}
            </p>
            <div className="mt-4 space-y-2">
              {customer.sites.length ? (
                customer.sites.map((site) => (
                  <div className="rounded bg-zinc-50 px-3 py-2" key={site.id}>
                    <p className="text-sm font-medium text-zinc-700">
                      {site.name}
                    </p>
                    <p className="text-xs text-zinc-500">{site.address}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400">No sites yet</p>
              )}
            </div>
          </article>
        ))}
        {!customers?.length && (
          <div className="rounded border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 md:col-span-2">
            Add your first customer, then add a service site.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-zinc-700">
      {label}
      <input
        className="mt-1.5 h-11 w-full rounded border border-zinc-300 px-3"
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}
