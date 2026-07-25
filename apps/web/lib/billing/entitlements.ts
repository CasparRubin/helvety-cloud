/**
 * P6f entitlements — plans and limits live in code (BILLING.md).
 * Free plan needs no Stripe customer or subscriptions row; billing metadata
 * is plaintext counts only and never touches vault keys or content.
 */

export type Plan = "free" | "pro";

export type PlanLimits = {
  /** Workspaces where the user has the `owner` role. */
  ownedWorkspaces: number;
  projectsPerWorkspace: number;
  /** Seats: accepted members + pending invitations count toward this. */
  membersPerWorkspace: number;
  tasksPerWorkspace: number;
  notesPerWorkspace: number;
  contactsPerWorkspace: number;
  /** Total ciphertext bytes allowed in Supabase Storage for the workspace. Free = 0. */
  storageBytesPerWorkspace: number;
  /** Max ciphertext bytes for a single upload. Free = 0. */
  maxUploadBytes: number;
};

const PRO_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GiB
const PRO_MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MiB

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    ownedWorkspaces: 2,
    projectsPerWorkspace: 5,
    membersPerWorkspace: 2,
    tasksPerWorkspace: 100,
    notesPerWorkspace: 50,
    contactsPerWorkspace: 50,
    storageBytesPerWorkspace: 0,
    maxUploadBytes: 0,
  },
  pro: {
    ownedWorkspaces: 10,
    projectsPerWorkspace: 100,
    membersPerWorkspace: 25,
    tasksPerWorkspace: 10_000,
    notesPerWorkspace: 5_000,
    contactsPerWorkspace: 5_000,
    storageBytesPerWorkspace: PRO_STORAGE_BYTES,
    maxUploadBytes: PRO_MAX_UPLOAD_BYTES,
  },
};

/** Stripe statuses that grant paid entitlements. Everything else = free. */
export const ENTITLED_STATUSES = ["active", "trialing"] as const;

export type SubscriptionLike = {
  plan: string;
  status: string;
} | null;

/**
 * Missing row, unknown plan, or a lapsed status (past_due, canceled, unpaid,
 * incomplete, paused, …) all resolve to free — never a silent paid plan.
 */
export function resolvePlan(subscription: SubscriptionLike): Plan {
  if (!subscription) {
    return "free";
  }
  if (
    subscription.plan === "pro" &&
    (ENTITLED_STATUSES as readonly string[]).includes(subscription.status)
  ) {
    return "pro";
  }
  return "free";
}

export function limitsForPlan(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export type WorkspaceMeter = "projects" | "tasks" | "notes" | "contacts";

export function workspaceMeterLimit(
  plan: Plan,
  meter: WorkspaceMeter,
): number {
  const limits = PLAN_LIMITS[plan];
  switch (meter) {
    case "projects":
      return limits.projectsPerWorkspace;
    case "tasks":
      return limits.tasksPerWorkspace;
    case "notes":
      return limits.notesPerWorkspace;
    case "contacts":
      return limits.contactsPerWorkspace;
    default: {
      const _exhaustive: never = meter;
      return _exhaustive;
    }
  }
}

const METER_LABEL: Record<WorkspaceMeter, string> = {
  projects: "projects",
  tasks: "tasks",
  notes: "notes",
  contacts: "contacts",
};

/** Honest, dark-pattern-free limit copy for API errors and UI. */
export function limitMessage(
  plan: Plan,
  meter: WorkspaceMeter,
  limit: number,
): string {
  const upgradeHint =
    plan === "free" ? " Upgrade this workspace to Pro for higher limits." : "";
  return `${capitalize(METER_LABEL[meter])} limit reached for the ${plan} plan (${limit} per workspace).${upgradeHint}`;
}

export function seatLimitMessage(plan: Plan, limit: number): string {
  const upgradeHint =
    plan === "free" ? " Upgrade this workspace to Pro for more seats." : "";
  return `Member limit reached for the ${plan} plan (${limit} seats per workspace, including pending invitations).${upgradeHint}`;
}

export function ownedWorkspacesLimitMessage(plan: Plan, limit: number): string {
  const upgradeHint =
    plan === "free"
      ? " Upgrade an existing workspace to Pro or delete an unused workspace."
      : "";
  return `Workspace limit reached (${limit} owned workspaces on the ${plan} plan).${upgradeHint}`;
}

/** Honest copy when free workspaces (or over-quota Pro) cannot upload files. */
export function storageLimitMessage(plan: Plan, limitBytes: number): string {
  if (plan === "free" || limitBytes === 0) {
    return "File uploads require a Pro workspace. Upgrade this workspace to Pro to attach files.";
  }
  return `Storage limit reached for the ${plan} plan (${formatBytes(limitBytes)} per workspace).`;
}

export function maxUploadLimitMessage(plan: Plan, limitBytes: number): string {
  if (plan === "free" || limitBytes === 0) {
    return "File uploads require a Pro workspace. Upgrade this workspace to Pro to attach files.";
  }
  return `File is too large for the ${plan} plan (max ${formatBytes(limitBytes)} per file).`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)} GB`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
