import {
  DEFAULT_MAX_VISIBLE_TASKS,
  normalizeCompletionPercent,
  normalizeMaxVisibleTasks,
  removeOption,
  setDefaultOption,
  type CategorizationIcon,
  type CategorizationKind,
  type CategorizationOption,
  type WorkspaceCategorizations,
} from "@/lib/client-crypto/categorizations";
import type { EntityColor } from "@/lib/client-crypto/entity-colors";
import {
  encryptWorkspaceName,
  type DecryptedWorkspaceListItem,
} from "@/lib/client-crypto/workspaces";
import { toWorkspacePlaintext } from "@/lib/client-crypto/workspace-plaintext";
import { patchWorkspace } from "@/lib/api/v1-client";

async function updateWorkspaceCategorizations(
  workspaceId: string,
  workspaceKey: Uint8Array,
  workspace: DecryptedWorkspaceListItem,
  categorizations: WorkspaceCategorizations,
  keyVersion: number,
): Promise<void> {
  const encryptedBlob = await encryptWorkspaceName(
    workspaceKey,
    workspaceId,
    toWorkspacePlaintext(workspace.name, categorizations),
    keyVersion,
  );
  await patchWorkspace(workspaceId, { encryptedBlob });
}

export async function addCategorizationOption(
  workspaceId: string,
  workspaceKey: Uint8Array,
  workspace: DecryptedWorkspaceListItem,
  keyVersion: number,
  kind: CategorizationKind,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  const list = workspace.categorizations[kind];
  const option: CategorizationOption = {
    id: crypto.randomUUID(),
    name: trimmed,
    sortOrder: list.reduce((max, o) => Math.max(max, o.sortOrder), -1) + 1,
  };
  if (kind === "stages") {
    option.maxVisibleTasks = DEFAULT_MAX_VISIBLE_TASKS;
  }
  const categorizations: WorkspaceCategorizations = {
    ...workspace.categorizations,
    [kind]: [...list, option],
  };
  await updateWorkspaceCategorizations(
    workspaceId,
    workspaceKey,
    workspace,
    categorizations,
    keyVersion,
  );
}

export async function renameCategorizationOption(
  workspaceId: string,
  workspaceKey: Uint8Array,
  workspace: DecryptedWorkspaceListItem,
  keyVersion: number,
  kind: CategorizationKind,
  optionId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  const categorizations: WorkspaceCategorizations = {
    ...workspace.categorizations,
    [kind]: workspace.categorizations[kind].map((o) =>
      o.id === optionId ? { ...o, name: trimmed } : o,
    ),
  };
  await updateWorkspaceCategorizations(
    workspaceId,
    workspaceKey,
    workspace,
    categorizations,
    keyVersion,
  );
}

export async function setCategorizationDefault(
  workspaceId: string,
  workspaceKey: Uint8Array,
  workspace: DecryptedWorkspaceListItem,
  keyVersion: number,
  kind: "stages" | "priorities",
  optionId: string,
): Promise<void> {
  const categorizations: WorkspaceCategorizations = {
    ...workspace.categorizations,
    [kind]: setDefaultOption(workspace.categorizations[kind], optionId),
  };
  await updateWorkspaceCategorizations(
    workspaceId,
    workspaceKey,
    workspace,
    categorizations,
    keyVersion,
  );
}

/** Set or clear an option accent color (labels, stages, priorities). */
export async function setCategorizationOptionColor(
  workspaceId: string,
  workspaceKey: Uint8Array,
  workspace: DecryptedWorkspaceListItem,
  keyVersion: number,
  kind: CategorizationKind,
  optionId: string,
  color: EntityColor | null,
): Promise<void> {
  const categorizations: WorkspaceCategorizations = {
    ...workspace.categorizations,
    [kind]: workspace.categorizations[kind].map((o) => {
      if (o.id !== optionId) return o;
      const next = { ...o };
      if (color) next.color = color;
      else delete next.color;
      return next;
    }),
  };
  await updateWorkspaceCategorizations(
    workspaceId,
    workspaceKey,
    workspace,
    categorizations,
    keyVersion,
  );
}

/** Set or clear an option icon (labels, stages, priorities). */
export async function setCategorizationOptionIcon(
  workspaceId: string,
  workspaceKey: Uint8Array,
  workspace: DecryptedWorkspaceListItem,
  keyVersion: number,
  kind: CategorizationKind,
  optionId: string,
  icon: CategorizationIcon | null,
): Promise<void> {
  const categorizations: WorkspaceCategorizations = {
    ...workspace.categorizations,
    [kind]: workspace.categorizations[kind].map((o) => {
      if (o.id !== optionId) return o;
      const next = { ...o };
      if (icon) next.icon = icon;
      else delete next.icon;
      return next;
    }),
  };
  await updateWorkspaceCategorizations(
    workspaceId,
    workspaceKey,
    workspace,
    categorizations,
    keyVersion,
  );
}

export async function setCategorizationOptionMaxVisibleTasks(
  workspaceId: string,
  workspaceKey: Uint8Array,
  workspace: DecryptedWorkspaceListItem,
  keyVersion: number,
  optionId: string,
  maxVisibleTasks: number,
): Promise<void> {
  const normalized = normalizeMaxVisibleTasks(maxVisibleTasks);
  if (normalized === null) {
    throw new Error("Show limit must be an integer from 1 to 500");
  }
  const categorizations: WorkspaceCategorizations = {
    ...workspace.categorizations,
    stages: workspace.categorizations.stages.map((o) =>
      o.id === optionId ? { ...o, maxVisibleTasks: normalized } : o,
    ),
  };
  await updateWorkspaceCategorizations(
    workspaceId,
    workspaceKey,
    workspace,
    categorizations,
    keyVersion,
  );
}

export async function setCategorizationOptionCompletionPercent(
  workspaceId: string,
  workspaceKey: Uint8Array,
  workspace: DecryptedWorkspaceListItem,
  keyVersion: number,
  optionId: string,
  completionPercent: number,
): Promise<void> {
  const normalized = normalizeCompletionPercent(completionPercent);
  if (normalized === null) {
    throw new Error("Completion must be an integer from 0 to 100");
  }
  const categorizations: WorkspaceCategorizations = {
    ...workspace.categorizations,
    stages: workspace.categorizations.stages.map((o) =>
      o.id === optionId ? { ...o, completionPercent: normalized } : o,
    ),
  };
  await updateWorkspaceCategorizations(
    workspaceId,
    workspaceKey,
    workspace,
    categorizations,
    keyVersion,
  );
}

export async function reorderCategorizationOption(
  workspaceId: string,
  workspaceKey: Uint8Array,
  workspace: DecryptedWorkspaceListItem,
  keyVersion: number,
  kind: CategorizationKind,
  optionId: string,
  direction: "up" | "down",
): Promise<void> {
  const list = [...workspace.categorizations[kind]].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  const index = list.findIndex((o) => o.id === optionId);
  if (index < 0) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= list.length) return;
  const a = list[index]!;
  const b = list[swapWith]!;
  const aOrder = a.sortOrder;
  list[index] = { ...a, sortOrder: b.sortOrder };
  list[swapWith] = { ...b, sortOrder: aOrder };
  const categorizations: WorkspaceCategorizations = {
    ...workspace.categorizations,
    [kind]: list,
  };
  await updateWorkspaceCategorizations(
    workspaceId,
    workspaceKey,
    workspace,
    categorizations,
    keyVersion,
  );
}

export async function deleteCategorizationOption(
  workspaceId: string,
  workspaceKey: Uint8Array,
  workspace: DecryptedWorkspaceListItem,
  keyVersion: number,
  kind: CategorizationKind,
  optionId: string,
): Promise<{
  remappedLabelId: string | null | undefined;
  remappedStageId: string | undefined;
  remappedPriorityId: string | undefined;
}> {
  const {
    categorizations,
    remappedLabelId,
    remappedStageId,
    remappedPriorityId,
  } = removeOption(workspace.categorizations, kind, optionId);

  await updateWorkspaceCategorizations(
    workspaceId,
    workspaceKey,
    workspace,
    categorizations,
    keyVersion,
  );
  return {
    remappedLabelId,
    remappedStageId,
    remappedPriorityId,
  };
}
