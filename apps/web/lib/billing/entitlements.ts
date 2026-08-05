/**
 * Billing catalog + effective limits (P12).
 * Free/Pro bases and addon pack sizes live in code so they can be tuned in one
 * place; Stripe Price IDs come from env. Never encryption keys or content.
 */

export type Plan = "free" | "pro";

/** One capacity increase pack raises every paid workspace meter together. */
export type AddonMeter = "capacity";

/** Workspace create gates that map 1:1 onto a catalog meter (except tasks). */
export type WorkspaceMeter =
  | "projects"
  | "tasks"
  | "notes"
  | "contacts"
  | "comments"
  | "boards";

export type PlanLimits = {
  /** Free-tier workspace slots attributed via created_by (not a privilege). */
  ownedWorkspaces: number;
  projectsPerWorkspace: number;
  /** Members: accepted members + pending invitations count toward this. */
  membersPerWorkspace: number;
  /** Tasks allowed per project (not workspace-wide). */
  tasksPerProject: number;
  notesPerWorkspace: number;
  contactsPerWorkspace: number;
  /** Comments + replies (every comments row) per workspace. */
  commentsPerWorkspace: number;
  /** Encrypted boards per workspace (server-enforced plaintext row count). */
  boardsPerWorkspace: number;
  /**
   * Max React Flow nodes (shapes + entity placements) per board.
   * Catalogued for pricing honesty; enforced client-side only (ciphertext).
   */
  nodesPerBoard: number;
  /** Max ready/pending attachments linked to a single task. Free = 0. */
  filesPerTask: number;
  /** Total ciphertext bytes allowed in Supabase Storage for the workspace. */
  storageBytesPerWorkspace: number;
  /** Max ciphertext bytes for a single upload. Free = 0. */
  maxUploadBytes: number;
};

const PRO_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GiB
const PRO_MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MiB

/**
 * Tunable Free / Pro defaults. Adjust here (redeploy); do not hardcode
 * elsewhere. Lowering caps grandfather existing data (create gates only).
 */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    // Personal workspace only; further owned workspaces require Pro.
    ownedWorkspaces: 1,
    projectsPerWorkspace: 2,
    membersPerWorkspace: 3,
    tasksPerProject: 50,
    notesPerWorkspace: 25,
    contactsPerWorkspace: 25,
    commentsPerWorkspace: 50,
    boardsPerWorkspace: 1,
    nodesPerBoard: 20,
    filesPerTask: 0,
    storageBytesPerWorkspace: 0,
    maxUploadBytes: 0,
  },
  pro: {
    // Soft ceiling on how many Pro Workspaces one user may own; each pays
    // separately. Free slots remain PLAN_LIMITS.free.ownedWorkspaces.
    ownedWorkspaces: 50,
    projectsPerWorkspace: 25,
    membersPerWorkspace: 25,
    tasksPerProject: 1000,
    notesPerWorkspace: 500,
    contactsPerWorkspace: 500,
    commentsPerWorkspace: 1000,
    boardsPerWorkspace: 25,
    nodesPerBoard: 400,
    filesPerTask: 5,
    storageBytesPerWorkspace: PRO_STORAGE_BYTES,
    maxUploadBytes: PRO_MAX_UPLOAD_BYTES,
  },
};

export type AddonPackDef = {
  meter: AddonMeter;
  /** UI quantity unit for this add-on definition. */
  packSize: number;
  /** Env var holding the Stripe Price ID for this pack. */
  priceEnv: string;
  label: string;
  deltas: {
    projects: number;
    tasksPerProject: number;
    notes: number;
    contacts: number;
    comments: number;
    boards: number;
    nodesPerBoard: number;
    members: number;
    storageBytes: number;
    filesPerTask: number;
  };
};

/**
 * Display prices for marketing UI (`/pricing`). Charged amounts live on Stripe
 * Prices; keep these in sync when changing Dashboard prices.
 */
export const DISPLAY_PRICES = {
  currency: "CHF",
  proWorkspaceYearly: "250",
  capacityIncreaseYearly: "99",
} as const;

/**
 * One recurring Stripe add-on (CHF 99 / year). Quantity N adds the same
 * bundle of capacity N times.
 */
export const CAPACITY_PACK: AddonPackDef = {
  meter: "capacity",
  packSize: 1,
  priceEnv: "STRIPE_PRICE_PRO_WORKSPACE_CAPACITY_INCREASE_YEARLY",
  label: "Capacity Increase",
  deltas: {
    projects: 10,
    tasksPerProject: 500,
    notes: 250,
    contacts: 250,
    comments: 500,
    boards: 10,
    nodesPerBoard: 200,
    members: 10,
    storageBytes: 2.5 * 1024 * 1024 * 1024, // 2.5 GiB
    filesPerTask: 0,
  },
};

export const ADDON_PACKS: readonly AddonPackDef[] = [CAPACITY_PACK] as const;

export type AddonQuantities = Partial<Record<AddonMeter, number>>;

/** Stripe statuses that grant paid entitlements. Everything else = free. */
export const ENTITLED_STATUSES = ["active", "trialing"] as const;

export type SubscriptionLike = {
  plan: string;
  status: string;
  addon_quantities?: AddonQuantities | null;
} | null;

/**
 * Missing row, unknown plan, or a lapsed status (past_due, canceled, unpaid,
 * incomplete, paused, …) all resolve to free, never a silent paid plan.
 * Stripe discounts (including 100% off) still sync as normal Pro.
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

function capacityPackCount(
  quantities: AddonQuantities | null | undefined,
): number {
  const qty = quantities?.capacity ?? 0;
  if (!Number.isFinite(qty) || qty <= 0) {
    return 0;
  }
  return Math.floor(qty);
}

/**
 * Effective limits for a workspace = plan base + purchased addon packs.
 */
export function effectiveLimits(subscription: SubscriptionLike): PlanLimits {
  const plan = resolvePlan(subscription);
  const base = PLAN_LIMITS[plan];
  const packCount = capacityPackCount(subscription?.addon_quantities ?? null);

  // Capacity increases only apply on entitled Pro. Free never gets them.
  if (plan !== "pro") {
    return { ...base };
  }

  return {
    ownedWorkspaces: base.ownedWorkspaces,
    projectsPerWorkspace:
      base.projectsPerWorkspace + packCount * CAPACITY_PACK.deltas.projects,
    membersPerWorkspace:
      base.membersPerWorkspace + packCount * CAPACITY_PACK.deltas.members,
    tasksPerProject:
      base.tasksPerProject + packCount * CAPACITY_PACK.deltas.tasksPerProject,
    notesPerWorkspace:
      base.notesPerWorkspace + packCount * CAPACITY_PACK.deltas.notes,
    contactsPerWorkspace:
      base.contactsPerWorkspace + packCount * CAPACITY_PACK.deltas.contacts,
    commentsPerWorkspace:
      base.commentsPerWorkspace + packCount * CAPACITY_PACK.deltas.comments,
    boardsPerWorkspace:
      base.boardsPerWorkspace + packCount * CAPACITY_PACK.deltas.boards,
    nodesPerBoard:
      base.nodesPerBoard + packCount * CAPACITY_PACK.deltas.nodesPerBoard,
    filesPerTask:
      base.filesPerTask + packCount * CAPACITY_PACK.deltas.filesPerTask,
    storageBytesPerWorkspace:
      base.storageBytesPerWorkspace +
      packCount * CAPACITY_PACK.deltas.storageBytes,
    maxUploadBytes: base.maxUploadBytes,
  };
}

export function workspaceMeterLimit(
  subscription: SubscriptionLike,
  meter: WorkspaceMeter,
): number {
  const limits = effectiveLimits(subscription);
  switch (meter) {
    case "projects":
      return limits.projectsPerWorkspace;
    case "tasks":
      return limits.tasksPerProject;
    case "notes":
      return limits.notesPerWorkspace;
    case "contacts":
      return limits.contactsPerWorkspace;
    case "comments":
      return limits.commentsPerWorkspace;
    case "boards":
      return limits.boardsPerWorkspace;
    default: {
      const _exhaustive: never = meter;
      return _exhaustive;
    }
  }
}

/** True when a limit is treated as unbounded (not used by current Free/Pro). */
export function isUnlimited(limit: number): boolean {
  return !Number.isFinite(limit) || limit >= Number.MAX_SAFE_INTEGER;
}

/** Serialize a limit for JSON APIs (non-finite → null). */
export function limitToApi(limit: number): number | null {
  return isUnlimited(limit) ? null : limit;
}

const METER_LABEL: Record<WorkspaceMeter, string> = {
  projects: "projects",
  tasks: "tasks",
  notes: "notes",
  contacts: "contacts",
  comments: "comments and replies",
  boards: "boards",
};

/** Honest, dark-pattern-free limit copy for API errors and UI. */
export function limitMessage(
  plan: Plan,
  meter: WorkspaceMeter,
  limit: number,
): string {
  const upgradeHint =
    plan === "free"
      ? " Upgrade this workspace to Pro Workspace for higher limits."
      : "";
  const scope = meter === "tasks" ? " per project" : " per workspace";
  return `${capitalize(METER_LABEL[meter])} limit reached for the ${plan} plan (${isUnlimited(limit) ? "unlimited" : limit}${scope}).${upgradeHint}`;
}

export function memberLimitMessage(plan: Plan, limit: number): string {
  const upgradeHint =
    plan === "free"
      ? " Upgrade this workspace to Pro Workspace for more members."
      : "";
  return `Member limit reached for the ${plan} plan (${isUnlimited(limit) ? "unlimited" : limit} members per workspace, including pending invitations).${upgradeHint}`;
}

export function ownedWorkspacesLimitMessage(plan: Plan, limit: number): string {
  const upgradeHint =
    plan === "free"
      ? " Create an additional workspace as Pro Workspace, or delete an unused workspace."
      : "";
  const cap = isUnlimited(limit)
    ? "unlimited owned workspaces"
    : limit === 1
      ? "1 owned workspace"
      : `${limit} owned workspaces`;
  return `Workspace limit reached (${cap} on the ${plan} plan).${upgradeHint}`;
}

/**
 * Soft-lock copy when a workspace is over the free owned-workspace allowance.
 */
export function freeOverflowLockMessage(freeSlots: number): string {
  const allowance =
    freeSlots === 1
      ? "1 free workspace per account"
      : `${freeSlots} free workspaces per account`;
  return `This workspace is over the free allowance (${allowance}). Existing content stays available; new creates are paused until you upgrade this workspace to Pro Workspace or reduce owned free workspaces.`;
}

export type FreeOverflowCandidate = {
  workspaceId: string;
  freeOverflowedAt: string | null;
  /** When tags tie, prefer locking non-personal so Personal stays the free slot. */
  kind?: "personal" | "standard" | string | null;
};

/** Lock exactly max(0, count - freeSlots) non-Pro workspaces; newest tag first. */
export function selectFreeOverflowLockedIds(
  nonProOwned: FreeOverflowCandidate[],
  freeSlots: number,
): Set<string> {
  const overflow = Math.max(0, nonProOwned.length - freeSlots);
  if (overflow === 0) {
    return new Set();
  }
  const ranked = [...nonProOwned].sort((a, b) => {
    const aTs = a.freeOverflowedAt
      ? Date.parse(a.freeOverflowedAt)
      : Number.NEGATIVE_INFINITY;
    const bTs = b.freeOverflowedAt
      ? Date.parse(b.freeOverflowedAt)
      : Number.NEGATIVE_INFINITY;
    if (bTs !== aTs) {
      return bTs - aTs;
    }
    const aPersonal = a.kind === "personal" ? 1 : 0;
    const bPersonal = b.kind === "personal" ? 1 : 0;
    if (aPersonal !== bPersonal) {
      return aPersonal - bPersonal;
    }
    return a.workspaceId.localeCompare(b.workspaceId);
  });
  return new Set(ranked.slice(0, overflow).map((row) => row.workspaceId));
}

/** Honest copy when free workspaces (or over-quota Pro) cannot upload files. */
export function storageLimitMessage(plan: Plan, limitBytes: number): string {
  if (plan === "free" || limitBytes === 0) {
    return "File uploads require a Pro Workspace. Upgrade this workspace to Pro Workspace to attach files.";
  }
  if (isUnlimited(limitBytes)) {
    return "Storage limit reached.";
  }
  return `Storage limit reached for the ${plan} plan (${formatBytes(limitBytes)} per workspace).`;
}

export function maxUploadLimitMessage(plan: Plan, limitBytes: number): string {
  if (plan === "free" || limitBytes === 0) {
    return "File uploads require a Pro Workspace. Upgrade this workspace to Pro Workspace to attach files.";
  }
  return `File is too large for the ${plan} plan (max ${formatBytes(limitBytes)} per file).`;
}

export function filesPerTaskLimitMessage(plan: Plan, limit: number): string {
  const upgradeHint =
    plan === "free"
      ? " Upgrade this workspace to Pro Workspace to attach files to tasks."
      : "";
  return `File limit reached for this task (${isUnlimited(limit) ? "unlimited" : limit} files on the ${plan} plan).${upgradeHint}`;
}

/** Client-enforced shapes-per-board copy (nodes live in ciphertext). */
export function nodesPerBoardLimitMessage(plan: Plan, limit: number): string {
  const upgradeHint =
    plan === "free"
      ? " Upgrade this workspace to Pro Workspace for larger boards."
      : "";
  return `Shape limit reached for this board (${isUnlimited(limit) ? "unlimited" : limit} shapes per board on the ${plan} plan).${upgradeHint}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "Unlimited";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
  const gb = bytes / (1024 * 1024 * 1024);
  return `${Number.isInteger(gb) ? gb.toFixed(0) : gb.toFixed(1)} GB`;
}

export function normalizeAddonQuantities(raw: unknown): AddonQuantities {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: AddonQuantities = {};
  for (const pack of ADDON_PACKS) {
    const value = (raw as Record<string, unknown>)[pack.meter];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      out[pack.meter] = Math.floor(value);
    }
  }
  return out;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
