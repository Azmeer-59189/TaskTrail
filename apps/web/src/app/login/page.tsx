import { redirect } from "next/navigation";
import { signIn, signUp } from "../auth/actions";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  const supabase = createSupabaseServerClient();
  let user = null;
  let connectionError: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    connectionError =
      "Cannot reach the configured Supabase project. Update the project URL and public key, then restart the web app.";
  }
  if (user) redirect("/");

  return (
    <main className="min-h-screen px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-field">
            TaskTrail
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold text-ink">
            Run field work from assignment to completion.
          </h1>
          <p className="mt-3 max-w-xl text-zinc-600">
            Managers use this dashboard. Workers sign in through the mobile app.
          </p>
        </div>

        {(connectionError || searchParams.error || searchParams.message) && (
          <div
            className={`mb-6 rounded border px-4 py-3 text-sm ${connectionError || searchParams.error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
          >
            {connectionError ?? searchParams.error ?? searchParams.message}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <AuthCard
            title="Sign in"
            description="Continue to your operations workspace."
          >
            <form action={signIn} className="space-y-4">
              <Field
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
              />
              <Field
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
              />
              <SubmitButton>Sign in</SubmitButton>
            </form>
          </AuthCard>
          <AuthCard
            title="Create an admin account"
            description="Start a new company workspace."
          >
            <form action={signUp} className="space-y-4">
              <Field label="Full name" name="fullName" autoComplete="name" />
              <Field
                label="Work email"
                name="email"
                type="email"
                autoComplete="email"
              />
              <Field
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
              />
              <SubmitButton>Create account</SubmitButton>
            </form>
          </AuthCard>
        </div>
      </div>
    </main>
  );
}

function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mb-6 mt-1 text-sm text-zinc-500">{description}</p>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-700">
      {label}
      <input
        autoComplete={autoComplete}
        className="mt-1.5 h-11 w-full rounded border border-zinc-300 px-3 outline-none transition focus:border-field focus:ring-2 focus:ring-emerald-100"
        name={name}
        required
        type={type}
      />
    </label>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="h-11 w-full rounded bg-ink px-4 text-sm font-semibold text-white hover:bg-zinc-700">
      {children}
    </button>
  );
}
