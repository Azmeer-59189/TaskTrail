import type { Session } from "@supabase/supabase-js";
import { formatJobStatus, type JobStatus } from "@tasktrail/shared";
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
      <Text style={styles.kicker}>TASKTRAIL WORKER</Text>
      <Text style={styles.authTitle}>Your field work, in one place.</Text>
      <Text style={styles.subtitle}>
        Sign in with the worker account provided by your manager.
      </Text>
      <View style={styles.formCard}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="worker@company.com"
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
              "id, title, description, status, priority, scheduled_date, time_window_start, time_window_end",
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
      setJobs((assignedJobs ?? []) as AssignedJob[]);
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
          <Text style={styles.title}>Hi, {context?.fullName ?? "worker"}</Text>
          <Text style={styles.subtitle}>
            {context?.role === "worker"
              ? "Your assigned field jobs"
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
            <Text style={styles.emptyTitle}>No assigned jobs</Text>
            <Text style={styles.emptyCopy}>
              New assignments from your manager will appear here. Pull down to
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
      {job.description && <Text style={styles.meta}>{job.description}</Text>}
      <View style={styles.row}>
        <Text style={styles.time}>
          {job.scheduled_date}
          {job.time_window_start
            ? ` · ${job.time_window_start.slice(0, 5)}`
            : ""}
          {job.time_window_end ? `–${job.time_window_end.slice(0, 5)}` : ""}
        </Text>
        <Text style={styles.priority}>{job.priority}</Text>
      </View>
      <Text style={styles.openHint}>Open job →</Text>
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("job_checklist_items")
      .select("id, label, is_required, is_completed")
      .eq("job_id", job.id)
      .order("sort_order")
      .then(({ data, error: checklistError }) => {
        if (checklistError) setError(friendlyError(checklistError));
        setChecklist((data ?? []) as ChecklistItem[]);
        setLoading(false);
      });
  }, [job.id]);

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
        await onChanged();
      }
    } catch (transitionError) {
      setError(friendlyError(transitionError));
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
        <Text style={styles.backText}>← Assigned jobs</Text>
      </Pressable>
      <View>
        <Text style={styles.kicker}>{job.priority.toUpperCase()} PRIORITY</Text>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.subtitle}>
          {job.description || "No additional instructions."}
        </Text>
      </View>
      <View style={styles.detailMeta}>
        <Text style={styles.time}>{job.scheduled_date}</Text>
        <Text style={styles.badge}>{formatJobStatus(status)}</Text>
      </View>
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.detailCard}>
        <Text style={styles.sectionTitle}>Checklist</Text>
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
          <Text style={styles.meta}>No checklist items for this job.</Text>
        )}
      </View>

      <View style={styles.actionStack}>
        {["assigned", "scheduled", "blocked"].includes(status) && (
          <ActionButton
            disabled={saving}
            label="Start job"
            onPress={() => transition("in_progress")}
          />
        )}
        {status === "in_progress" && (
          <>
            <ActionButton
              disabled={saving || requiredIncomplete}
              label={
                requiredIncomplete ? "Complete checklist first" : "Complete job"
              }
              onPress={() => transition("completed")}
            />
            <ActionButton
              secondary
              disabled={saving}
              label="Mark blocked"
              onPress={() => transition("blocked")}
            />
          </>
        )}
        {status === "completed" && (
          <View style={styles.successCard}>
            <Text style={styles.successText}>Job completed successfully.</Text>
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
