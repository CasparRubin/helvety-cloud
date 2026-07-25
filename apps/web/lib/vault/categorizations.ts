/** Project-scoped task categorization option definitions (encrypted in project blob). */

export type CategorizationOption = {
  id: string;
  name: string;
  color?: string;
  sortOrder: number;
  /** Stages and priorities only; exactly one default per kind. */
  isDefault?: boolean;
};

export type ProjectCategorizations = {
  labels: CategorizationOption[];
  stages: CategorizationOption[];
  priorities: CategorizationOption[];
};

export type CategorizationKind = keyof ProjectCategorizations;

const LABEL_NAMES = ["bug", "new feature", "change request"] as const;
const STAGE_NAMES = [
  "backlog",
  "discovery",
  "ready",
  "in progress",
  "testing",
  "acceptance",
  "completed",
  "cancelled",
] as const;
const PRIORITY_NAMES = ["low", "normal", "high", "urgent"] as const;

function option(
  name: string,
  sortOrder: number,
  isDefault?: boolean,
): CategorizationOption {
  const o: CategorizationOption = {
    id: crypto.randomUUID(),
    name,
    sortOrder,
  };
  if (isDefault) o.isDefault = true;
  return o;
}

/** Seed defaults for a new project (fresh UUIDs each call). */
export function defaultCategorizations(): ProjectCategorizations {
  return {
    labels: LABEL_NAMES.map((name, i) => option(name, i)),
    stages: STAGE_NAMES.map((name, i) =>
      option(name, i, name === "backlog"),
    ),
    priorities: PRIORITY_NAMES.map((name, i) =>
      option(name, i, name === "normal"),
    ),
  };
}

function isOptionArray(value: unknown): value is CategorizationOption[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      typeof (item as CategorizationOption).id === "string" &&
      typeof (item as CategorizationOption).name === "string" &&
      typeof (item as CategorizationOption).sortOrder === "number",
  );
}

/** Parse categorizations from decrypted project plaintext; null if missing/invalid. */
export function parseCategorizations(
  value: unknown,
): ProjectCategorizations | null {
  if (value === null || typeof value !== "object") return null;
  const c = value as Record<string, unknown>;
  if (
    !isOptionArray(c.labels) ||
    !isOptionArray(c.stages) ||
    !isOptionArray(c.priorities)
  ) {
    return null;
  }
  if (c.stages.length < 1 || c.priorities.length < 1) return null;
  return {
    labels: c.labels,
    stages: c.stages,
    priorities: c.priorities,
  };
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
      if (o.isDefault) next.isDefault = true;
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
