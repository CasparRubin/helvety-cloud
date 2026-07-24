/**
 * P6f entitlements — plans and limits live in code (BILLING.md).
 * Free plan needs no Stripe customer or subscriptions row; billing metadata
 * is plaintext counts only and never touches vault keys or content.
 */

export const PLANS = ["free", "pro"] as const;
export type Plan = (typeof PLANS)[number];

export type PlanLimits = {
  /** Workspaces where the user has the `owner` role. */
  ownedWorkspaces: number;
  projectsPerWorkspace: number;
  /** Seats: accepted members + pending invitations count toward this. */
  membersPerWorkspace: number;
  issuesPerWorkspace: number;
  notesPerWorkspace: number;
  contactsPerWorkspace: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    ownedWorkspaces: 2,
    projectsPerWorkspace: 5,
    membersPerWorkspace: 2,
    issuesPerWorkspace: 100,
    notesPerWorkspace: 50,
    contactsPerWorkspace: 50,
  },
  pro: {
    ownedWorkspaces: 10,
    projectsPerWorkspace: 100,
    membersPerWorkspace: 25,
    issuesPerWorkspace: 10_000,
    notesPerWorkspace: 5_000,
    contactsPerWorkspace: 5_000,
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

export type WorkspaceMeter = "projects" | "issues" | "notes" | "contacts";

export function workspaceMeterLimit(
  plan: Plan,
  meter: WorkspaceMeter,
): number {
  const limits = PLAN_LIMITS[plan];
  switch (meter) {
    case "projects":
      return limits.projectsPerWorkspace;
    case "issues":
      return limits.issuesPerWorkspace;
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
  issues: "issues",
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
