/**
 * Billing catalog + effective limits (P12).
 * Free/Pro bases and addon pack sizes live in code so they can be tuned in one
 * place; Stripe Price IDs come from env. Never vault keys or content.
 */

export type Plan = "free" | "pro";

export type BillingSource = "stripe" | "comp";

/** Meters that addons (and workspace create gates) can raise. */
export type AddonMeter =
  | "projects"
  | "tasksPerProject"
  | "notes"
  | "contacts"
  | "members"
  | "storageBytes"
  | "filesPerTask";

/** Workspace create gates that map 1:1 onto a catalog meter (except tasks). */
export type WorkspaceMeter = "projects" | "tasks" | "notes" | "contacts";

export type PlanLimits = {
  /** Workspaces where the user has the `owner` role (free slots only). */
  ownedWorkspaces: number;
  projectsPerWorkspace: number;
  /** Seats: accepted members + pending invitations count toward this. */
  membersPerWorkspace: number;
  /** Tasks allowed per project (not workspace-wide). */
  tasksPerProject: number;
  notesPerWorkspace: number;
  contactsPerWorkspace: number;
  /** Max ready/pending attachments linked to a single task. Free = 0. */
  filesPerTask: number;
  /** Total ciphertext bytes allowed in Supabase Storage for the workspace. */
  storageBytesPerWorkspace: number;
  /** Max ciphertext bytes for a single upload. Free = 0. */
  maxUploadBytes: number;
};

const PRO_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GiB
const PRO_MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MiB

/** Sentinel for complimentary / unmetered workspaces. */
export const UNLIMITED = Number.POSITIVE_INFINITY;

/**
 * Tunable Free / Pro defaults. Adjust here (redeploy) — do not hardcode
 * elsewhere. Lowering caps grandfather existing data (create gates only).
 */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    ownedWorkspaces: 2,
    projectsPerWorkspace: 1,
    membersPerWorkspace: 4,
    tasksPerProject: 50,
    notesPerWorkspace: 50,
    contactsPerWorkspace: 50,
    filesPerTask: 0,
    storageBytesPerWorkspace: 0,
    maxUploadBytes: 0,
  },
  pro: {
    // Soft ceiling on how many Pro workspaces one user may own; each pays
    // (or is gifted) separately. Free slots remain PLAN_LIMITS.free.ownedWorkspaces.
    ownedWorkspaces: 50,
    projectsPerWorkspace: 25,
    membersPerWorkspace: 25,
    tasksPerProject: 500,
    notesPerWorkspace: 500,
    contactsPerWorkspace: 500,
    filesPerTask: 5,
    storageBytesPerWorkspace: PRO_STORAGE_BYTES,
    maxUploadBytes: PRO_MAX_UPLOAD_BYTES,
  },
};

export type AddonPackDef = {
  meter: AddonMeter;
  /** How much one purchased quantity unit adds to the effective limit. */
  packSize: number;
  /** Env var holding the Stripe Price ID for this pack. */
  priceEnv: string;
  label: string;
};

/**
 * À-la-carte packs (Pro only). Quantity N on the Stripe subscription item
 * adds N * packSize to the corresponding meter.
 */
export const ADDON_PACKS: readonly AddonPackDef[] = [
  {
    meter: "projects",
    packSize: 10,
    priceEnv: "STRIPE_PRICE_ADDON_PROJECTS",
    label: "+10 projects",
  },
  {
    meter: "tasksPerProject",
    packSize: 100,
    priceEnv: "STRIPE_PRICE_ADDON_TASKS",
    label: "+100 tasks per project",
  },
  {
    meter: "notes",
    packSize: 100,
    priceEnv: "STRIPE_PRICE_ADDON_NOTES",
    label: "+100 notes",
  },
  {
    meter: "contacts",
    packSize: 100,
    priceEnv: "STRIPE_PRICE_ADDON_CONTACTS",
    label: "+100 contacts",
  },
  {
    meter: "members",
    packSize: 5,
    priceEnv: "STRIPE_PRICE_ADDON_MEMBERS",
    label: "+5 seats",
  },
  {
    meter: "storageBytes",
    packSize: 5 * 1024 * 1024 * 1024,
    priceEnv: "STRIPE_PRICE_ADDON_STORAGE",
    label: "+5 GiB storage",
  },
  {
    meter: "filesPerTask",
    packSize: 5,
    priceEnv: "STRIPE_PRICE_ADDON_FILES_PER_TASK",
    label: "+5 files per task",
  },
] as const;

export type AddonQuantities = Partial<Record<AddonMeter, number>>;

/** Stripe statuses that grant paid entitlements. Everything else = free. */
export const ENTITLED_STATUSES = ["active", "trialing"] as const;

export type SubscriptionLike = {
  plan: string;
  status: string;
  billing_source?: string | null;
  unmetered?: boolean | null;
  addon_quantities?: AddonQuantities | null;
} | null;

/**
 * Missing row, unknown plan, or a lapsed status (past_due, canceled, unpaid,
 * incomplete, paused, …) all resolve to free — never a silent paid plan.
 * Comp grants use plan=pro + status=active + billing_source=comp.
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

export function isUnmetered(subscription: SubscriptionLike): boolean {
  return Boolean(
    subscription &&
      resolvePlan(subscription) === "pro" &&
      subscription.unmetered,
  );
}

export function limitsForPlan(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

function addonDelta(
  quantities: AddonQuantities | null | undefined,
  meter: AddonMeter,
): number {
  const qty = quantities?.[meter] ?? 0;
  if (!Number.isFinite(qty) || qty <= 0) {
    return 0;
  }
  const pack = ADDON_PACKS.find((p) => p.meter === meter);
  if (!pack) {
    return 0;
  }
  return Math.floor(qty) * pack.packSize;
}

/**
 * Effective limits for a workspace = plan base + purchased addon packs.
 * Complimentary (unmetered) workspaces get UNLIMITED on countable meters;
 * maxUploadBytes stays at the Pro catalog value (practical upload size).
 */
export function effectiveLimits(subscription: SubscriptionLike): PlanLimits {
  if (isUnmetered(subscription)) {
    const pro = PLAN_LIMITS.pro;
    return {
      ownedWorkspaces: UNLIMITED,
      projectsPerWorkspace: UNLIMITED,
      membersPerWorkspace: UNLIMITED,
      tasksPerProject: UNLIMITED,
      notesPerWorkspace: UNLIMITED,
      contactsPerWorkspace: UNLIMITED,
      filesPerTask: UNLIMITED,
      storageBytesPerWorkspace: UNLIMITED,
      maxUploadBytes: pro.maxUploadBytes,
    };
  }

  const plan = resolvePlan(subscription);
  const base = PLAN_LIMITS[plan];
  const q = subscription?.addon_quantities ?? null;

  // Addons only apply on entitled Pro (paid or would-be; free never gets them).
  if (plan !== "pro") {
    return { ...base };
  }

  return {
    ownedWorkspaces: base.ownedWorkspaces,
    projectsPerWorkspace:
      base.projectsPerWorkspace + addonDelta(q, "projects"),
    membersPerWorkspace: base.membersPerWorkspace + addonDelta(q, "members"),
    tasksPerProject: base.tasksPerProject + addonDelta(q, "tasksPerProject"),
    notesPerWorkspace: base.notesPerWorkspace + addonDelta(q, "notes"),
    contactsPerWorkspace:
      base.contactsPerWorkspace + addonDelta(q, "contacts"),
    filesPerTask: base.filesPerTask + addonDelta(q, "filesPerTask"),
    storageBytesPerWorkspace:
      base.storageBytesPerWorkspace + addonDelta(q, "storageBytes"),
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
    default: {
      const _exhaustive: never = meter;
      return _exhaustive;
    }
  }
}

/** True when the limit is treated as unlimited (comp / unmetered). */
export function isUnlimited(limit: number): boolean {
  return !Number.isFinite(limit) || limit >= Number.MAX_SAFE_INTEGER;
}

/** Serialize a limit for JSON APIs (Infinity → null). */
export function limitToApi(limit: number): number | null {
  return isUnlimited(limit) ? null : limit;
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
  const scope =
    meter === "tasks" ? " per project" : " per workspace";
  return `${capitalize(METER_LABEL[meter])} limit reached for the ${plan} plan (${isUnlimited(limit) ? "unlimited" : limit}${scope}).${upgradeHint}`;
}

export function seatLimitMessage(plan: Plan, limit: number): string {
  const upgradeHint =
    plan === "free" ? " Upgrade this workspace to Pro for more seats." : "";
  return `Member limit reached for the ${plan} plan (${isUnlimited(limit) ? "unlimited" : limit} seats per workspace, including pending invitations).${upgradeHint}`;
}

export function ownedWorkspacesLimitMessage(plan: Plan, limit: number): string {
  const upgradeHint =
    plan === "free"
      ? " Create an additional workspace as Pro, redeem a complimentary code, or delete an unused workspace."
      : "";
  return `Workspace limit reached (${isUnlimited(limit) ? "unlimited" : limit} owned workspaces on the ${plan} plan).${upgradeHint}`;
}

/** Honest copy when free workspaces (or over-quota Pro) cannot upload files. */
export function storageLimitMessage(plan: Plan, limitBytes: number): string {
  if (plan === "free" || limitBytes === 0) {
    return "File uploads require a Pro workspace. Upgrade this workspace to Pro to attach files.";
  }
  if (isUnlimited(limitBytes)) {
    return "Storage limit reached.";
  }
  return `Storage limit reached for the ${plan} plan (${formatBytes(limitBytes)} per workspace).`;
}

export function maxUploadLimitMessage(plan: Plan, limitBytes: number): string {
  if (plan === "free" || limitBytes === 0) {
    return "File uploads require a Pro workspace. Upgrade this workspace to Pro to attach files.";
  }
  return `File is too large for the ${plan} plan (max ${formatBytes(limitBytes)} per file).`;
}

export function filesPerTaskLimitMessage(plan: Plan, limit: number): string {
  const upgradeHint =
    plan === "free"
      ? " Upgrade this workspace to Pro to attach files to tasks."
      : "";
  return `File limit reached for this task (${isUnlimited(limit) ? "unlimited" : limit} files on the ${plan} plan).${upgradeHint}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "Unlimited";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)} GB`;
}

export function normalizeAddonQuantities(
  raw: unknown,
): AddonQuantities {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: AddonQuantities = {};
  for (const pack of ADDON_PACKS) {
    const value = (raw as Record<string, unknown>)[pack.meter];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      // Cap pack quantity to limit abuse / Stripe line-item bloat.
      out[pack.meter] = Math.min(100, Math.floor(value));
    }
  }
  return out;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
