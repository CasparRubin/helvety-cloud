import {
  cloneCategorizations,
  removeOption,
  remapTaskIdsByName,
  setDefaultOption,
  type CategorizationKind,
  type CategorizationOption,
  type ProjectCategorizations,
} from "@/lib/vault/categorizations";
import {
  loadDecryptedProject,
  saveProjectContent,
  type DecryptedProject,
} from "@/lib/vault/projects";
import {
  remapTasksForCategorizationChange,
  type DecryptedTask,
} from "@/lib/vault/tasks";

async function updateProjectCategorizations(
  workspaceId: string,
  workspaceKey: Uint8Array,
  project: DecryptedProject,
  categorizations: ProjectCategorizations,
): Promise<DecryptedProject> {
  return saveProjectContent(workspaceId, workspaceKey, project, {
    name: project.name,
    categorizations,
  });
}

export async function addCategorizationOption(
  workspaceId: string,
  workspaceKey: Uint8Array,
  project: DecryptedProject,
  kind: CategorizationKind,
  name: string,
): Promise<DecryptedProject> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  const list = project.categorizations[kind];
  const option: CategorizationOption = {
    id: crypto.randomUUID(),
    name: trimmed,
    sortOrder: list.reduce((max, o) => Math.max(max, o.sortOrder), -1) + 1,
  };
  const categorizations: ProjectCategorizations = {
    ...project.categorizations,
    [kind]: [...list, option],
  };
  return updateProjectCategorizations(
    workspaceId,
    workspaceKey,
    project,
    categorizations,
  );
}

export async function renameCategorizationOption(
  workspaceId: string,
  workspaceKey: Uint8Array,
  project: DecryptedProject,
  kind: CategorizationKind,
  optionId: string,
  name: string,
): Promise<DecryptedProject> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  const categorizations: ProjectCategorizations = {
    ...project.categorizations,
    [kind]: project.categorizations[kind].map((o) =>
      o.id === optionId ? { ...o, name: trimmed } : o,
    ),
  };
  return updateProjectCategorizations(
    workspaceId,
    workspaceKey,
    project,
    categorizations,
  );
}

export async function setCategorizationDefault(
  workspaceId: string,
  workspaceKey: Uint8Array,
  project: DecryptedProject,
  kind: "stages" | "priorities",
  optionId: string,
): Promise<DecryptedProject> {
  const categorizations: ProjectCategorizations = {
    ...project.categorizations,
    [kind]: setDefaultOption(project.categorizations[kind], optionId),
  };
  return updateProjectCategorizations(
    workspaceId,
    workspaceKey,
    project,
    categorizations,
  );
}

export async function reorderCategorizationOption(
  workspaceId: string,
  workspaceKey: Uint8Array,
  project: DecryptedProject,
  kind: CategorizationKind,
  optionId: string,
  direction: "up" | "down",
): Promise<DecryptedProject> {
  const list = [...project.categorizations[kind]].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  const index = list.findIndex((o) => o.id === optionId);
  if (index < 0) return project;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= list.length) return project;
  const a = list[index]!;
  const b = list[swapWith]!;
  const aOrder = a.sortOrder;
  list[index] = { ...a, sortOrder: b.sortOrder };
  list[swapWith] = { ...b, sortOrder: aOrder };
  const categorizations: ProjectCategorizations = {
    ...project.categorizations,
    [kind]: list,
  };
  return updateProjectCategorizations(
    workspaceId,
    workspaceKey,
    project,
    categorizations,
  );
}

/** Delete option and remap tasks that referenced it. */
export async function deleteCategorizationOption(
  workspaceId: string,
  workspaceKey: Uint8Array,
  project: DecryptedProject,
  kind: CategorizationKind,
  optionId: string,
): Promise<DecryptedProject> {
  const {
    categorizations,
    remappedLabelId,
    remappedStageId,
    remappedPriorityId,
  } = removeOption(project.categorizations, kind, optionId);

  await remapTasksForCategorizationChange(
    workspaceId,
    project.id,
    workspaceKey,
    (task: DecryptedTask) => {
      if (kind === "labels" && task.labelId === optionId) {
        return {
          labelId: remappedLabelId ?? null,
          stageId: task.stageId,
          priorityId: task.priorityId,
        };
      }
      if (kind === "stages" && task.stageId === optionId) {
        return {
          labelId: task.labelId,
          stageId: remappedStageId ?? task.stageId,
          priorityId: task.priorityId,
        };
      }
      if (kind === "priorities" && task.priorityId === optionId) {
        return {
          labelId: task.labelId,
          stageId: task.stageId,
          priorityId: remappedPriorityId ?? task.priorityId,
        };
      }
      return null;
    },
  );

  return updateProjectCategorizations(
    workspaceId,
    workspaceKey,
    project,
    categorizations,
  );
}

/** Copy source categorizations onto target; remap target tasks by option name. */
export async function copyProjectCategorizations(
  workspaceId: string,
  workspaceKey: Uint8Array,
  sourceProjectId: string,
  targetProjectId: string,
): Promise<DecryptedProject> {
  if (sourceProjectId === targetProjectId) {
    throw new Error("Choose a different project to copy from");
  }
  const [source, target] = await Promise.all([
    loadDecryptedProject(workspaceId, sourceProjectId, workspaceKey),
    loadDecryptedProject(workspaceId, targetProjectId, workspaceKey),
  ]);
  const oldCats = target.categorizations;
  const clone = cloneCategorizations(source.categorizations);
  const saved = await saveProjectContent(workspaceId, workspaceKey, target, {
    name: target.name,
    categorizations: clone,
  });

  await remapTasksForCategorizationChange(
    workspaceId,
    targetProjectId,
    workspaceKey,
    (task) => {
      const next = remapTaskIdsByName(
        {
          labelId: task.labelId,
          stageId: task.stageId,
          priorityId: task.priorityId,
        },
        oldCats,
        clone,
      );
      return {
        labelId: next.labelId,
        stageId: next.stageId,
        priorityId: next.priorityId,
      };
    },
  );

  return saved;
}
