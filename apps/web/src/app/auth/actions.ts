"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";

const value = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

function authRedirect(kind: "error" | "message", message: string): never {
  redirect(`/login?${kind}=${encodeURIComponent(message)}`);
}

const connectionMessage =
  "Cannot reach the configured Supabase project. Check the project URL and project status.";

export async function signIn(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  if (!email || !password)
    authRedirect("error", "Email and password are required.");

  const supabase = createSupabaseServerClient();
  let error;
  try {
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
  } catch {
    authRedirect("error", connectionMessage);
  }
  if (error) authRedirect("error", error.message);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const fullName = value(formData, "fullName");
  const email = value(formData, "email");
  const password = value(formData, "password");
  if (!fullName || !email || password.length < 8) {
    authRedirect(
      "error",
      "Enter your name, email, and a password of at least 8 characters.",
    );
  }

  const supabase = createSupabaseServerClient();
  let data;
  let error;
  try {
    ({ data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    }));
  } catch {
    authRedirect("error", connectionMessage);
  }
  if (error) authRedirect("error", error.message);
  if (!data.session)
    authRedirect(
      "message",
      "Check your email to confirm your account, then sign in.",
    );
  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function createWorkspace(formData: FormData) {
  const workspaceName = value(formData, "workspaceName");
  if (workspaceName.length < 2)
    redirect(
      `/onboarding?error=${encodeURIComponent("Enter a workspace name.")}`,
    );

  const supabase = createSupabaseServerClient();
  let error;
  try {
    ({ error } = await supabase.rpc("create_workspace", {
      workspace_name: workspaceName,
    }));
  } catch {
    redirect(`/onboarding?error=${encodeURIComponent(connectionMessage)}`);
  }
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect("/");
}
