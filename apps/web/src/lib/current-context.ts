import type { Role } from "@tasktrail/shared";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

export async function requireWorkspaceContext(allowedRoles?: Role[]) {
  const supabase = createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("auth_user_id", authData.user.id)
    .single();
  if (profileError) throw new Error(profileError.message);

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, status")
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .single();
  if (membershipError) redirect("/onboarding");

  const role = membership.role as Role;
  if (allowedRoles && !allowedRoles.includes(role)) redirect("/");

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", membership.workspace_id)
    .single();
  if (workspaceError) throw new Error(workspaceError.message);

  return {
    supabase,
    user: authData.user,
    profile,
    membership: { ...membership, role },
    workspace,
  };
}
