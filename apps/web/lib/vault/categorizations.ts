/** Project-scoped task categorization option definitions (encrypted in project blob). */

import {
  DEFAULT_OPTION_ICONS,
  isCategorizationIcon,
  type CategorizationIcon,
} from "@/lib/vault/categorization-icons";
import {
  isEntityColor,
  type EntityColor,
} from "@/lib/vault/entity-colors";

export type { CategorizationIcon };

export type CategorizationOption = {
  id: string;
  name: string;
  color?: EntityColor;
  /** Allowlisted Lucide icon token (ciphertext). */
  icon?: CategorizationIcon;
  sortOrder: number;
  /** Stages and priorities only; exactly one default per kind. */
  isDefault?: boolean;
  /** Stages only: board starts collapsed when true. */
  collapsedByDefault?: boolean;
};

export type ProjectCategorizations = {
  labels: CategorizationOption[];
  stages: CategorizationOption[];
  priorities: CategorizationOption[];
};

export type CategorizationKind = keyof ProjectCategorizations;

const LABEL_NAMES = ["Bug", "New Feature", "Change Request"] as const;
const STAGE_NAMES = [
  "Backlog",
  "Discovery",
  "Ready",
  "In Progress",
  "Testing",
  "Acceptance",
  "Completed",
  "Cancelled",
] as const;
const PRIORITY_NAMES = ["Low", "Normal", "High", "Urgent"] as const;

/** Default colors for seeded stage names (also used when stage.color is missing). */
const DEFAULT_STAGE_COLORS: Record<
  (typeof STAGE_NAMES)[number],
  EntityColor
> = {
  Backlog: "slate",
  Discovery: "violet",
  Ready: "blue",
  "In Progress": "amber",
  Testing: "teal",
  Acceptance: "orange",
  Completed: "green",
  Cancelled: "red",
};

/** Resolve a stage chip color: stored token, else name map, else undefined. */
export function resolveStageColor(
  stage: Pick<CategorizationOption, "name" | "color"> | null | undefined,
): EntityColor | undefined {
  if (!stage) return undefined;
  if (stage.color) return stage.color;
  return DEFAULT_STAGE_COLORS[
    stage.name as keyof typeof DEFAULT_STAGE_COLORS
  ];
}

function option(
  name: string,
  sortOrder: number,
  opts?: {
    isDefault?: boolean;
    color?: EntityColor;
    icon?: CategorizationIcon;
    collapsedByDefault?: boolean;
  },
): CategorizationOption {
  const o: CategorizationOption = {
    id: crypto.randomUUID(),
    name,
    sortOrder,
  };
  if (opts?.isDefault) o.isDefault = true;
  if (opts?.color) o.color = opts.color;
  if (opts?.icon) o.icon = opts.icon;
  if (opts?.collapsedByDefault) o.collapsedByDefault = true;
  return o;
}

/** Seed defaults for a new project (fresh UUIDs each call). */
export function defaultCategorizations(): ProjectCategorizations {
  return {
    labels: LABEL_NAMES.map((name, i) =>
      option(name, i, { icon: DEFAULT_OPTION_ICONS[name] }),
    ),
    stages: STAGE_NAMES.map((name, i) =>
      option(name, i, {
        isDefault: name === "Backlog",
        color: DEFAULT_STAGE_COLORS[name],
        icon: DEFAULT_OPTION_ICONS[name],
        collapsedByDefault: name === "Backlog" || name === "Cancelled",
      }),
    ),
    priorities: PRIORITY_NAMES.map((name, i) =>
      option(name, i, {
        isDefault: name === "Normal",
        icon: DEFAULT_OPTION_ICONS[name],
      }),
    ),
  };
}

function normalizeOption(item: unknown): CategorizationOption | null {
  if (item === null || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.name !== "string" ||
    typeof o.sortOrder !== "number"
  ) {
    return null;
  }
  const next: CategorizationOption = {
    id: o.id,
    name: o.name,
    sortOrder: o.sortOrder,
  };
  if (o.isDefault === true) next.isDefault = true;
  if (typeof o.collapsedByDefault === "boolean") {
    next.collapsedByDefault = o.collapsedByDefault;
  }
  // Ignore invalid color/icon tokens rather than rejecting the whole option.
  if (o.color !== undefined && isEntityColor(o.color)) {
    next.color = o.color;
  }
  if (o.icon !== undefined && isCategorizationIcon(o.icon)) {
    next.icon = o.icon;
  }
  return next;
}

function parseOptionArray(value: unknown): CategorizationOption[] | null {
  if (!Array.isArray(value)) return null;
  const out: CategorizationOption[] = [];
  for (const item of value) {
    const o = normalizeOption(item);
    if (!o) return null;
    out.push(o);
  }
  return out;
}

/** Parse categorizations from decrypted project plaintext; null if missing/invalid. */
export function parseCategorizations(
  value: unknown,
): ProjectCategorizations | null {
  if (value === null || typeof value !== "object") return null;
  const c = value as Record<string, unknown>;
  const labels = parseOptionArray(c.labels);
  const stages = parseOptionArray(c.stages);
  const priorities = parseOptionArray(c.priorities);
  if (!labels || !stages || !priorities) return null;
  if (stages.length < 1 || priorities.length < 1) return null;
  return { labels, stages, priorities };
}

export function defaultStage(c: ProjectCategorizations): CategorizationOption {
  return c.stages.find((s) => s.isDefault) ?? c.stages[0]!;
}

export function defaultPriority(
  c: ProjectCategorizations,
): CategorizationOption {
  return c.priorities.find((p) => p.isDefault) ?? c.priorities[0]!;
}

export function findOption(
  options: CategorizationOption[],
  id: string | null | undefined,
): CategorizationOption | null {
  if (!id) return null;
  return options.find((o) => o.id === id) ?? null;
}

/** Clone categorizations with new UUIDs. */
export function cloneCategorizations(
  source: ProjectCategorizations,
): ProjectCategorizations {
  function cloneList(list: CategorizationOption[]): CategorizationOption[] {
    return list.map((o) => {
      const next: CategorizationOption = {
        id: crypto.randomUUID(),
        name: o.name,
        sortOrder: o.sortOrder,
      };
      if (o.color !== undefined) next.color = o.color;
      if (o.icon !== undefined) next.icon = o.icon;
      if (o.isDefault) next.isDefault = true;
      if (o.collapsedByDefault !== undefined) {
        next.collapsedByDefault = o.collapsedByDefault;
      }
      return next;
    });
  }

  return {
    labels: cloneList(source.labels),
    stages: cloneList(source.stages),
    priorities: cloneList(source.priorities),
  };
}

/**
 * Remap a task's categorization ids when copying defs by option name.
 * Unmatched stage/priority → new defaults; unmatched label → null.
 */
export function remapTaskIdsByName(
  oldIds: {
    labelId: string | null;
    stageId: string | null;
    priorityId: string | null;
  },
  oldCats: ProjectCategorizations,
  newCats: ProjectCategorizations,
): {
  labelId: string | null;
  stageId: string;
  priorityId: string;
} {
  const labelName = oldIds.labelId
    ? oldCats.labels.find((o) => o.id === oldIds.labelId)?.name
    : null;
  const stageName = oldIds.stageId
    ? oldCats.stages.find((o) => o.id === oldIds.stageId)?.name
    : null;
  const priorityName = oldIds.priorityId
    ? oldCats.priorities.find((o) => o.id === oldIds.priorityId)?.name
    : null;

  const labelId = labelName
    ? (newCats.labels.find((o) => o.name === labelName)?.id ?? null)
    : null;
  const stageId =
    (stageName
      ? newCats.stages.find((o) => o.name === stageName)?.id
      : null) ?? defaultStage(newCats).id;
  const priorityId =
    (priorityName
      ? newCats.priorities.find((o) => o.name === priorityName)?.id
      : null) ?? defaultPriority(newCats).id;

  return { labelId, stageId, priorityId };
}

export function setDefaultOption(
  list: CategorizationOption[],
  optionId: string,
): CategorizationOption[] {
  return list.map((o) => {
    const next = { ...o };
    if (o.id === optionId) next.isDefault = true;
    else delete next.isDefault;
    return next;
  });
}

export function removeOption(
  cats: ProjectCategorizations,
  kind: CategorizationKind,
  optionId: string,
): {
  categorizations: ProjectCategorizations;
  remappedLabelId: string | null | undefined;
  remappedStageId: string | undefined;
  remappedPriorityId: string | undefined;
} {
  if (kind === "labels") {
    return {
      categorizations: {
        ...cats,
        labels: cats.labels.filter((o) => o.id !== optionId),
      },
      remappedLabelId: null,
      remappedStageId: undefined,
      remappedPriorityId: undefined,
    };
  }

  if (kind === "stages") {
    if (cats.stages.length <= 1) {
      throw new Error("A project must have at least one stage");
    }
    const remaining = cats.stages.filter((o) => o.id !== optionId);
    const removed = cats.stages.find((o) => o.id === optionId);
    let stages = remaining;
    if (removed?.isDefault) {
      stages = setDefaultOption(remaining, remaining[0]!.id);
    }
    return {
      categorizations: { ...cats, stages },
      remappedLabelId: undefined,
      remappedStageId: defaultStage({ ...cats, stages }).id,
      remappedPriorityId: undefined,
    };
  }

  if (cats.priorities.length <= 1) {
    throw new Error("A project must have at least one priority");
  }
  const remaining = cats.priorities.filter((o) => o.id !== optionId);
  const removed = cats.priorities.find((o) => o.id === optionId);
  let priorities = remaining;
  if (removed?.isDefault) {
    priorities = setDefaultOption(remaining, remaining[0]!.id);
  }
  return {
    categorizations: { ...cats, priorities },
    remappedLabelId: undefined,
    remappedStageId: undefined,
    remappedPriorityId: defaultPriority({ ...cats, priorities }).id,
  };
}
