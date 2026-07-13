"use server";

import type { Priority, Role } from "@tasktrail/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspaceContext } from "../../lib/current-context";
import { createSupabaseAdminClient } from "../../lib/supabase/admin";

const value = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();
const go = (path: string, kind: "error" | "success", message: string): never =>
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);

export async function createTeamMember(formData: FormData) {
  const { workspace } = await requireWorkspaceContext(["admin"]);
  const fullName = value(formData, "fullName");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const role = value(formData, "role") as Role;
  if (
    !fullName ||
    !email ||
    password.length < 8 ||
    !["manager", "worker"].includes(role)
  ) {
    go(
      "/team",
      "error",
      "Enter a name, email, role, and temporary password of at least 8 characters.",
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
  if (createError || !created.user)
    go("/team", "error", createError?.message ?? "Could not create the user.");
  const createdUser = created.user!;

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", createdUser.id)
    .single();
  if (profileError || !profile) {
    await admin.auth.admin.deleteUser(createdUser.id);
    go(
      "/team",
      "error",
      profileError?.message ?? "The user profile was not created.",
    );
  }
  const profileId = profile!.id;

  const { error: membershipError } = await admin
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      profile_id: profileId,
      role,
      status: "active",
    });
  if (membershipError) {
    await admin.auth.admin.deleteUser(createdUser.id);
    go("/team", "error", membershipError.message);
  }

  revalidatePath("/team");
  go("/team", "success", `${fullName} can now sign in on mobile.`);
}

export async function createCustomer(formData: FormData) {
  const { supabase, workspace } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const name = value(formData, "name");
  if (!name) go("/customers", "error", "Customer name is required.");

  const { error } = await supabase.from("customers").insert({
    workspace_id: workspace.id,
    name,
    contact_name: value(formData, "contactName") || null,
    email: value(formData, "email") || null,
    phone: value(formData, "phone") || null,
  });
  if (error) go("/customers", "error", error.message);
  revalidatePath("/customers");
  go("/customers", "success", `${name} was added.`);
}

export async function createSite(formData: FormData) {
  const { supabase, workspace } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const customerId = value(formData, "customerId");
  const name = value(formData, "siteName");
  const address = value(formData, "address");
  if (!customerId || !name || !address)
    go("/customers", "error", "Customer, site name, and address are required.");

  const { error } = await supabase
    .from("sites")
    .insert({
      workspace_id: workspace.id,
      customer_id: customerId,
      name,
      address,
    });
  if (error) go("/customers", "error", error.message);
  revalidatePath("/customers");
  go("/customers", "success", `${name} site was added.`);
}

export async function createJob(formData: FormData) {
  const { supabase, workspace, profile } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const title = value(formData, "title");
  const customerId = value(formData, "customerId");
  const siteId = value(formData, "siteId");
  const assignedTo = value(formData, "assignedTo");
  const scheduledDate = value(formData, "scheduledDate");
  const priority = value(formData, "priority") as Priority;
  if (
    !title ||
    !customerId ||
    !siteId ||
    !scheduledDate ||
    !["low", "normal", "high", "urgent"].includes(priority)
  ) {
    go("/jobs/new", "error", "Complete all required job fields.");
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      workspace_id: workspace.id,
      customer_id: customerId,
      site_id: siteId,
      title,
      description: value(formData, "description") || null,
      priority,
      status: assignedTo ? "assigned" : "scheduled",
      scheduled_date: scheduledDate,
      time_window_start: value(formData, "timeStart") || null,
      time_window_end: value(formData, "timeEnd") || null,
      assigned_to: assignedTo || null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !job)
    go("/jobs/new", "error", error?.message ?? "Could not create the job.");
  const jobId = job!.id;

  const checklist = value(formData, "checklist")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (checklist.length) {
    const { error: checklistError } = await supabase
      .from("job_checklist_items")
      .insert(
        checklist.map((label, index) => ({
          job_id: jobId,
          label,
          sort_order: index,
        })),
      );
    if (checklistError)
      go(
        "/jobs",
        "error",
        `Job created, but checklist failed: ${checklistError.message}`,
      );
  }

  await supabase
    .from("job_events")
    .insert({
      job_id: jobId,
      profile_id: profile.id,
      event_type: "created",
      message: assignedTo ? "Job created and assigned" : "Job scheduled",
    });
  revalidatePath("/");
  revalidatePath("/jobs");
  go("/jobs", "success", `${title} was created.`);
}
