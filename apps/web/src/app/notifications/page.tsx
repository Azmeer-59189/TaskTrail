import Link from "next/link";
import { markNotificationRead } from "../actions/operations";
import { AppShell, Notice } from "../../components/app-shell";
import { RealtimeRefresh } from "../../components/realtime-refresh";
import { requireWorkspaceContext } from "../../lib/current-context";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const { supabase, workspace, profile } = await requireWorkspaceContext([
    "admin",
    "manager",
  ]);
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, job_id, notification_type, title, body, read_at, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <AppShell currentPath="/notifications" workspaceName={workspace.name}>
      <RealtimeRefresh profileId={profile.id} workspaceId={workspace.id} />
      <header className="mb-6">
        <p className="text-sm font-semibold text-field">Activity</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Notifications</h1>
      </header>
      <Notice>{searchParams.error ?? error?.message}</Notice>
      <div className="divide-y overflow-hidden rounded border border-zinc-200 bg-white">
        {(notifications ?? []).map((notification) => (
          <div className={`p-5 ${notification.read_at ? "" : "bg-emerald-50/50"}`} key={notification.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-ink">{notification.title}</p>
                <p className="mt-1 text-sm text-zinc-600">{notification.body}</p>
                <p className="mt-2 text-xs text-zinc-400">{formatDateTime(notification.created_at)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {notification.job_id && <Link className="text-sm font-semibold text-field" href={`/jobs/${notification.job_id}`}>Open task</Link>}
                {!notification.read_at && <form action={markNotificationRead}><input name="notificationId" type="hidden" value={notification.id} /><button className="text-sm font-semibold text-zinc-500">Mark read</button></form>}
              </div>
            </div>
          </div>
        ))}
        {!notifications?.length && <p className="px-5 py-12 text-center text-sm text-zinc-500">You are all caught up.</p>}
      </div>
    </AppShell>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
