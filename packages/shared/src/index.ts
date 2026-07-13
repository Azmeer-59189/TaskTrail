export const ROLES = ["admin", "manager", "worker"] as const;
export const JOB_STATUSES = [
  "draft",
  "scheduled",
  "assigned",
  "in_progress",
  "blocked",
  "code_review",
  "testing",
  "completed",
  "reviewed",
  "cancelled",
] as const;
export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type Role = (typeof ROLES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export const TASK_TYPES = [
  "feature",
  "bug",
  "improvement",
  "research",
  "maintenance",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
};

export type Profile = {
  id: string;
  authUserId: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
};

export type Customer = {
  id: string;
  workspaceId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export type Site = {
  id: string;
  workspaceId: string;
  customerId: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
};

export type Job = {
  id: string;
  workspaceId: string;
  customerId: string;
  siteId: string;
  title: string;
  description?: string;
  priority: Priority;
  status: JobStatus;
  scheduledDate: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  assignedTo?: string;
  createdBy: string;
  completedAt?: string;
  reviewedAt?: string;
  createdAt: string;
};

export function formatJobStatus(status: JobStatus) {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
