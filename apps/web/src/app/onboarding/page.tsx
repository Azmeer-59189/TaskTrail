import { redirect } from "next/navigation";
import { createWorkspace, signOut } from "../auth/actions";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (profile) {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("status", "active")
      .maybeSingle();
    if (membership) redirect("/");
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold text-field">Workspace setup</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">
          Name your company workspace
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          This is where managers, workers, customers, and jobs will live.
        </p>
        {searchParams.error && (
          <div className="mt-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {searchParams.error}
          </div>
        )}
        <form action={createWorkspace} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-zinc-700">
            Workspace name
            <input
              autoFocus
              className="mt-1.5 h-11 w-full rounded border border-zinc-300 px-3 outline-none focus:border-field focus:ring-2 focus:ring-emerald-100"
              name="workspaceName"
              placeholder="Acme Field Services"
              required
            />
          </label>
          <button className="h-11 w-full rounded bg-field px-4 text-sm font-semibold text-white">
            Create workspace
          </button>
        </form>
        <form action={signOut} className="mt-3">
          <button className="w-full py-2 text-sm font-medium text-zinc-500">
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
