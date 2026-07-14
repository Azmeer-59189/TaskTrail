"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RealtimeRefreshProps = {
  workspaceId: string;
  jobId?: string;
  profileId?: string;
};

/** Refreshes server-rendered task views when another team member changes work. */
export function RealtimeRefresh({ workspaceId, jobId, profileId }: RealtimeRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 250);
    };
    const channel = supabase
      .channel(`tasktrail:${jobId ?? workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs", filter: `workspace_id=eq.${workspaceId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `workspace_id=eq.${workspaceId}` }, refresh);

    if (jobId) {
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "job_checklist_items", filter: `job_id=eq.${jobId}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "task_updates", filter: `job_id=eq.${jobId}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "job_events", filter: `job_id=eq.${jobId}` }, refresh);
    }
    if (profileId) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` }, refresh);
    }
    channel.subscribe();

    return () => {
      clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [jobId, profileId, router, workspaceId]);

  return null;
}
