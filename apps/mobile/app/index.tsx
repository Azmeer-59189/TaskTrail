import type { Session } from "@supabase/supabase-js";
import { formatJobStatus, type JobStatus } from "@tasktrail/shared";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type WorkerContext = { fullName: string; role: string; workspaceName: string };
type AssignedJob = {
  id: string;
  title: string;
  description: string | null;
  status: JobStatus;
  priority: string;
  scheduled_date: string;
  time_window_start: string | null;
  time_window_end: string | null;
  task_type: string;
  estimated_hours: number | null;
  logged_hours: number;
  github_url: string | null;
  blocker_reason: string | null;
  project: { name: string; code: string } | null;
};
type TaskUpdate = {
  id: string;
  update_type: string;
  body: string;
  hours_logged: number;
  created_at: string;
};
type ChecklistItem = {
  id: string;
  label: string;
  is_required: boolean;
  is_completed: boolean;
};

const connectionMessage =
  "Cannot reach the configured Supabase project. Ask your manager to check the project URL and status.";

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch|network|resolve|connection/i.test(message)
    ? connectionMessage
    : message;
}

function normalizeExternalUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return <ConfigurationScreen />;
  if (checkingSession)
    return <CenteredLoader label="Restoring your session…" />;
  if (!session) return <SignInScreen />;
  return <WorkerScreen session={session} />;
}

function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (!email.trim() || !password)
      return setError("Enter your email and password.");
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) setError(friendlyError(signInError));
    } catch (signInError) {
      setError(friendlyError(signInError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.authScreen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>TT</Text>
      </View>
      <Text style={styles.kicker}>TASKTRAIL DEVELOPER</Text>
      <Text style={styles.authTitle}>Your development work, in one place.</Text>
      <Text style={styles.subtitle}>
        Sign in with the developer account provided by your manager.
      </Text>
      <View style={styles.formCard}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="developer@company.com"
          style={styles.input}
          value={email}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="password"
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Pressable
          disabled={loading}
          onPress={signIn}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            loading && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign in</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function WorkerScreen({ session }: { session: Session }) {
  const [context, setContext] = useState<WorkerContext | null>(null);
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<AssignedJob | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      if (profileError || !profile) {
        setError(
          profileError
            ? friendlyError(profileError)
            : "Your profile has not been created yet.",
        );
        setLoading(false);
        return;
      }
      const { data: membership, error: membershipError } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("profile_id", profile.id)
        .eq("status", "active")
        .maybeSingle();
      if (membershipError || !membership) {
        setError(
          membershipError
            ? friendlyError(membershipError)
            : "Your manager has not added you to a workspace yet.",
        );
        setLoading(false);
        return;
      }

      const [{ data: workspace }, { data: assignedJobs, error: jobsError }] =
        await Promise.all([
          supabase
            .from("workspaces")
            .select("name")
            .eq("id", membership.workspace_id)
            .single(),
          supabase
            .from("jobs")
            .select(
              "id, title, description, status, priority, scheduled_date, time_window_start, time_window_end, task_type, estimated_hours, logged_hours, github_url, blocker_reason, project:projects(name, code)",
            )
            .eq("assigned_to", profile.id)
            .order("scheduled_date", { ascending: true }),
        ]);
      if (jobsError) setError(friendlyError(jobsError));
      setContext({
        fullName: profile.full_name,
        role: membership.role,
        workspaceName: workspace?.name ?? "Workspace",
      });
      setJobs(
        (assignedJobs ?? []).map((task) => ({
          ...task,
          project: Array.isArray(task.project) ? task.project[0] : task.project,
        })) as AssignedJob[],
      );
    } catch (loadError) {
      setError(friendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }, [session.user.id]);

  useEffect(() => {
    void load();
  }, [load]);
  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };
  if (loading) return <CenteredLoader label="Loading assigned jobs…" />;
  if (selectedJob)
    return (
      <JobDetail
        job={selectedJob}
        onBack={() => setSelectedJob(null)}
        onChanged={load}
      />
    );

  return (
    <ScrollView
      refreshControl={
        <RefreshControl onRefresh={refresh} refreshing={refreshing} />
      }
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>
            {context?.workspaceName.toUpperCase() ?? "TASKTRAIL"}
          </Text>
          <Text style={styles.title}>Hi, {context?.fullName ?? "developer"}</Text>
          <Text style={styles.subtitle}>
            {context?.role === "worker"
              ? "Your assigned development tasks"
              : `Signed in as ${context?.role ?? "member"}`}
          </Text>
        </View>
        <Pressable
          onPress={() => supabase.auth.signOut({ scope: "local" })}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <View style={styles.list}>
        {jobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No assigned tasks</Text>
            <Text style={styles.emptyCopy}>
              New tasks from your manager will appear here. Pull down to
              refresh.
            </Text>
          </View>
        ) : (
          jobs.map((job) => (
            <JobCard
              job={job}
              key={job.id}
              onOpen={() => setSelectedJob(job)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function JobCard({ job, onOpen }: { job: AssignedJob; onOpen: () => void }) {
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Text style={styles.jobTitle}>{job.title}</Text>
        <Text style={styles.badge}>{formatJobStatus(job.status)}</Text>
      </View>
      <Text style={styles.meta}>
        {job.project?.code ?? "PROJECT"} · {job.task_type}
      </Text>
      {job.description && (
        <Text numberOfLines={2} style={styles.meta}>
          {job.description}
        </Text>
      )}
      <View style={styles.row}>
        <Text style={styles.time}>
          {job.scheduled_date}
          {` · ${Number(job.logged_hours ?? 0)}h logged`}
        </Text>
        <Text style={styles.priority}>{job.priority}</Text>
      </View>
      <Text style={styles.openHint}>Open task →</Text>
    </Pressable>
  );
}

function JobDetail({
  job,
  onBack,
  onChanged,
}: {
  job: AssignedJob;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [status, setStatus] = useState(job.status);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [updateKind, setUpdateKind] = useState<
    "progress" | "blocker" | "time" | "link"
  >("progress");
  const [updateBody, setUpdateBody] = useState("");
  const [hours, setHours] = useState("");
  const [githubUrl, setGithubUrl] = useState(job.github_url ?? "");
  const [loggedHours, setLoggedHours] = useState(
    Number(job.logged_hours ?? 0),
  );
  const [blockerReason, setBlockerReason] = useState(
    job.blocker_reason ?? "",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    const [checklistResult, updatesResult] = await Promise.all([
      supabase
        .from("job_checklist_items")
        .select("id, label, is_required, is_completed")
        .eq("job_id", job.id)
        .order("sort_order"),
      supabase
        .from("task_updates")
        .select("id, update_type, body, hours_logged, created_at")
        .eq("job_id", job.id)
        .order("created_at", { ascending: false }),
    ]);
    const detailsError = checklistResult.error ?? updatesResult.error;
    if (detailsError) setError(friendlyError(detailsError));
    setChecklist((checklistResult.data ?? []) as ChecklistItem[]);
    setUpdates((updatesResult.data ?? []) as TaskUpdate[]);
    setLoading(false);
  }, [job.id]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const toggleItem = async (item: ChecklistItem) => {
    const completed = !item.is_completed;
    setChecklist((items) =>
      items.map((current) =>
        current.id === item.id
          ? { ...current, is_completed: completed }
          : current,
      ),
    );
    const { error: updateError } = await supabase
      .from("job_checklist_items")
      .update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    if (updateError) {
      setChecklist((items) =>
        items.map((current) => (current.id === item.id ? item : current)),
      );
      setError(friendlyError(updateError));
    }
  };

  const transition = async (nextStatus: JobStatus) => {
    setSaving(true);
    setError(null);
    try {
      const { error: transitionError } = await supabase.rpc(
        "transition_assigned_job",
        { target_job_id: job.id, next_status: nextStatus },
      );
      if (transitionError) setError(friendlyError(transitionError));
      else {
        setStatus(nextStatus);
        if (nextStatus === "in_progress") setBlockerReason("");
        await onChanged();
      }
    } catch (transitionError) {
      setError(friendlyError(transitionError));
    } finally {
      setSaving(false);
    }
  };

  const addUpdate = async () => {
    const hoursValue = hours.trim() ? Number(hours) : 0;
    const normalizedGithubUrl = normalizeExternalUrl(githubUrl);
    if (!updateBody.trim()) return setError("Write an update before saving.");
    if (!Number.isFinite(hoursValue) || hoursValue < 0)
      return setError("Logged hours must be zero or greater.");
    if (githubUrl.trim() && !normalizedGithubUrl)
      return setError("Enter a valid GitHub issue or PR URL.");
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.rpc(
        "add_assigned_task_update",
        {
          target_job_id: job.id,
          update_kind: updateKind,
          update_body: updateBody.trim(),
          hours_value: hoursValue,
          github_url_value: normalizedGithubUrl,
        },
      );
      if (updateError) throw updateError;
      if (hoursValue > 0) setLoggedHours((current) => current + hoursValue);
      if (normalizedGithubUrl) setGithubUrl(normalizedGithubUrl);
      if (updateKind === "blocker") {
        setStatus("blocked");
        setBlockerReason(updateBody.trim());
      }
      setUpdateBody("");
      setHours("");
      setUpdateKind("progress");
      await loadDetails();
      await onChanged();
    } catch (updateError) {
      setError(friendlyError(updateError));
    } finally {
      setSaving(false);
    }
  };

  const requiredIncomplete = checklist.some(
    (item) => item.is_required && !item.is_completed,
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack}>
        <Text style={styles.backText}>← Assigned tasks</Text>
      </Pressable>
      <View>
        <Text style={styles.kicker}>
          {job.project?.code ?? "PROJECT"} · {job.task_type.toUpperCase()}
        </Text>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.subtitle}>
          {job.description || "No additional instructions."}
        </Text>
      </View>
      <View style={styles.detailMeta}>
        <Text style={styles.time}>
          Due {job.scheduled_date} · {loggedHours}h logged
        </Text>
        <Text style={styles.badge}>{formatJobStatus(status)}</Text>
      </View>
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.detailCard}>
        <Text style={styles.sectionTitle}>Subtasks</Text>
        {loading ? (
          <ActivityIndicator color="#1F7A5A" />
        ) : checklist.length ? (
          checklist.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => toggleItem(item)}
              style={styles.checklistRow}
            >
              <View
                style={[
                  styles.checkbox,
                  item.is_completed && styles.checkboxDone,
                ]}
              >
                <Text style={styles.checkmark}>
                  {item.is_completed ? "✓" : ""}
                </Text>
              </View>
              <Text
                style={[
                  styles.checklistLabel,
                  item.is_completed && styles.checklistLabelDone,
                ]}
              >
                {item.label}
                {item.is_required ? " *" : ""}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.meta}>No subtasks for this task.</Text>
        )}
      </View>

      <View style={styles.detailCard}>
        <Text style={styles.sectionTitle}>Development details</Text>
        <Text style={styles.meta}>
          Estimate:{" "}
          {job.estimated_hours == null
            ? "Not estimated"
            : `${Number(job.estimated_hours)} hours`}
        </Text>
        {blockerReason && (
          <View style={styles.blockerCard}>
            <Text style={styles.blockerLabel}>CURRENT BLOCKER</Text>
            <Text style={styles.blockerText}>{blockerReason}</Text>
          </View>
        )}
        {normalizeExternalUrl(githubUrl || job.github_url) ? (
          <Pressable
            onPress={() =>
              Linking.openURL(
                normalizeExternalUrl(githubUrl || job.github_url)!,
              ).catch((openError) => setError(friendlyError(openError)))
            }
          >
            <Text style={styles.linkText}>Open GitHub issue or PR ↗</Text>
          </Pressable>
        ) : (
          <Text style={styles.meta}>No GitHub issue or PR linked.</Text>
        )}
      </View>

      {status !== "completed" && (
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Add update</Text>
          <View style={styles.kindRow}>
            {(["progress", "blocker", "time", "link"] as const).map((kind) => (
              <Pressable
                key={kind}
                onPress={() => setUpdateKind(kind)}
                style={[
                  styles.kindButton,
                  updateKind === kind && styles.kindButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.kindText,
                    updateKind === kind && styles.kindTextActive,
                  ]}
                >
                  {kind}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            multiline
            onChangeText={setUpdateBody}
            placeholder={
              updateKind === "blocker"
                ? "What is blocked and what help is needed?"
                : "What changed, what is next, or what was completed?"
            }
            style={styles.updateInput}
            textAlignVertical="top"
            value={updateBody}
          />
          <View style={styles.updateFields}>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setHours}
              placeholder="Hours"
              style={[styles.input, styles.flexInput]}
              value={hours}
            />
            <TextInput
              autoCapitalize="none"
              keyboardType="url"
              onChangeText={setGithubUrl}
              placeholder="GitHub issue or PR URL"
              style={[styles.input, styles.flexWideInput]}
              value={githubUrl}
            />
          </View>
          <ActionButton
            disabled={saving}
            label="Save update"
            onPress={addUpdate}
          />
        </View>
      )}

      <View style={styles.detailCard}>
        <Text style={styles.sectionTitle}>Update history</Text>
        {loading ? (
          <ActivityIndicator color="#1F7A5A" />
        ) : updates.length ? (
          updates.map((update) => (
            <View style={styles.updateCard} key={update.id}>
              <View style={styles.row}>
                <Text
                  style={[
                    styles.updateBadge,
                    update.update_type === "blocker" &&
                      styles.updateBadgeBlocker,
                  ]}
                >
                  {update.update_type}
                </Text>
                {Number(update.hours_logged) > 0 && (
                  <Text style={styles.meta}>
                    +{Number(update.hours_logged)}h
                  </Text>
                )}
              </View>
              <Text style={styles.updateText}>{update.body}</Text>
              <Text style={styles.updateDate}>
                {new Date(update.created_at).toLocaleString()}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>No updates yet.</Text>
        )}
      </View>

      <View style={styles.actionStack}>
        {["assigned", "scheduled"].includes(status) && (
          <ActionButton
            disabled={saving}
            label="Start task"
            onPress={() => transition("in_progress")}
          />
        )}
        {status === "blocked" && (
          <ActionButton
            disabled={saving}
            label="Resume task"
            onPress={() => transition("in_progress")}
          />
        )}
        {status === "in_progress" && (
          <>
            <ActionButton
              disabled={saving || requiredIncomplete}
              label={
                requiredIncomplete
                  ? "Complete subtasks first"
                  : "Send to code review"
              }
              onPress={() => transition("code_review")}
            />
          </>
        )}
        {status === "code_review" && (
          <>
            <ActionButton
              disabled={saving}
              label="Move to testing"
              onPress={() => transition("testing")}
            />
            <ActionButton
              secondary
              disabled={saving}
              label="Return to development"
              onPress={() => transition("in_progress")}
            />
          </>
        )}
        {status === "testing" && (
          <>
            <ActionButton
              disabled={saving}
              label="Mark task complete"
              onPress={() => transition("completed")}
            />
            <ActionButton
              secondary
              disabled={saving}
              label="Return to development"
              onPress={() => transition("in_progress")}
            />
          </>
        )}
        {status === "completed" && (
          <View style={styles.successCard}>
            <Text style={styles.successText}>Task completed successfully.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        secondary && styles.secondaryButton,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          secondary && styles.secondaryButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ConfigurationScreen() {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyTitle}>Supabase setup needed</Text>
      <Text style={styles.centeredCopy}>
        Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to
        apps/mobile/.env, then restart Expo.
      </Text>
    </View>
  );
}

function CenteredLoader({ label }: { label: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color="#1F7A5A" size="large" />
      <Text style={styles.centeredCopy}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F8F5" },
  content: { padding: 20, gap: 20 },
  authScreen: {
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: "#F7F8F5",
    padding: 24,
  },
  brandMark: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1F7A5A",
    marginBottom: 20,
  },
  brandMarkText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  kicker: {
    color: "#1F7A5A",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  authTitle: {
    color: "#172026",
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "800",
    marginTop: 8,
  },
  title: { color: "#172026", fontSize: 28, fontWeight: "800", marginTop: 5 },
  subtitle: { color: "#59636A", fontSize: 15, lineHeight: 22, marginTop: 5 },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DFE3E0",
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    marginTop: 28,
    gap: 9,
  },
  label: { color: "#374047", fontSize: 13, fontWeight: "700", marginTop: 3 },
  input: {
    height: 48,
    borderColor: "#CED4D0",
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 13,
    color: "#172026",
    backgroundColor: "#FFFFFF",
    marginBottom: 5,
  },
  primaryButton: {
    height: 48,
    borderRadius: 9,
    backgroundColor: "#172026",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
  errorText: { color: "#A33A32", fontSize: 13, lineHeight: 19 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerCopy: { flex: 1 },
  signOutButton: {
    borderColor: "#D7DCD9",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },
  signOutText: { color: "#59636A", fontSize: 12, fontWeight: "700" },
  list: { gap: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DFE3E0",
    borderRadius: 10,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  jobTitle: { color: "#172026", fontSize: 17, fontWeight: "700", flex: 1 },
  meta: { color: "#59636A", lineHeight: 20 },
  time: { color: "#172026", fontSize: 13, fontWeight: "600", flex: 1 },
  badge: {
    backgroundColor: "#E9F2EE",
    borderRadius: 6,
    color: "#1F7A5A",
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  priority: {
    color: "#8A5D13",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD2CE",
    borderStyle: "dashed",
    borderRadius: 10,
    borderWidth: 1,
    padding: 30,
  },
  emptyTitle: {
    color: "#172026",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyCopy: {
    color: "#59636A",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 7,
  },
  errorCard: {
    borderColor: "#F0C5C1",
    borderWidth: 1,
    backgroundColor: "#FFF2F1",
    borderRadius: 9,
    padding: 13,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8F5",
    padding: 30,
    gap: 14,
  },
  centeredCopy: {
    color: "#59636A",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
  },
  openHint: { color: "#1F7A5A", fontSize: 12, fontWeight: "800" },
  backText: { color: "#1F7A5A", fontSize: 14, fontWeight: "700" },
  detailMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DFE3E0",
    padding: 14,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DFE3E0",
    padding: 16,
    gap: 12,
  },
  sectionTitle: { color: "#172026", fontSize: 17, fontWeight: "800" },
  blockerCard: {
    borderColor: "#F0C5C1",
    borderWidth: 1,
    backgroundColor: "#FFF2F1",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  blockerLabel: {
    color: "#A33A32",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  blockerText: { color: "#7B2E28", fontSize: 13, lineHeight: 19 },
  linkText: { color: "#1F7A5A", fontSize: 13, fontWeight: "800" },
  kindRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  kindButton: {
    borderColor: "#D7DCD9",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  kindButtonActive: { backgroundColor: "#1F7A5A", borderColor: "#1F7A5A" },
  kindText: {
    color: "#59636A",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  kindTextActive: { color: "#FFFFFF" },
  updateInput: {
    minHeight: 100,
    borderColor: "#CED4D0",
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
    color: "#172026",
    backgroundColor: "#FFFFFF",
  },
  updateFields: { flexDirection: "row", gap: 8 },
  flexInput: { flex: 0.35, marginBottom: 0 },
  flexWideInput: { flex: 1, marginBottom: 0 },
  updateCard: {
    borderTopColor: "#EEF0EE",
    borderTopWidth: 1,
    paddingTop: 11,
    gap: 7,
  },
  updateBadge: {
    color: "#1F7A5A",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  updateBadgeBlocker: { color: "#A33A32" },
  updateText: { color: "#374047", fontSize: 14, lineHeight: 20 },
  updateDate: { color: "#8A938E", fontSize: 11 },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 7,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#AAB4AE",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: "#1F7A5A", borderColor: "#1F7A5A" },
  checkmark: { color: "#FFFFFF", fontWeight: "900" },
  checklistLabel: { flex: 1, color: "#374047", fontSize: 15 },
  checklistLabelDone: { color: "#8A938E", textDecorationLine: "line-through" },
  actionStack: { gap: 10 },
  actionButton: {
    height: 50,
    borderRadius: 9,
    backgroundColor: "#172026",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DCD9",
  },
  secondaryButtonText: { color: "#59636A" },
  successCard: { backgroundColor: "#E9F2EE", borderRadius: 9, padding: 16 },
  successText: { color: "#1F7A5A", fontWeight: "800", textAlign: "center" },
});
