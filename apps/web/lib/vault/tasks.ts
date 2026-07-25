import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type {
  EntityLinkTarget,
  TaskResponse,
} from "@helvety-cloud/api-contract";

import {
  deleteTask as deleteTaskApi,
  getTask,
  listTasks,
  putTask,
  type ListTasksParams,
} from "@/lib/api/v1-client";
import {
  defaultPriority,
  defaultStage,
  type ProjectCategorizations,
} from "@/lib/vault/categorizations";
import { extractEntityRefsFromDoc } from "@/lib/vault/entity-refs";
import {
  EMPTY_TASK_BODY,
  parseTaskPlaintext,
  toTaskPlaintext,
  type TaskBodyDoc,
  type TaskPlaintext,
} from "@/lib/vault/task-plaintext";

const textDecoder = new TextDecoder();

export type DecryptedTask = {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  body: TaskBodyDoc;
  labelId: string | null;
  stageId: string | null;
  priorityId: string | null;
  links: EntityLinkTarget[];
  sortOrder: number;
  updatedAt: string;
  deletedAt: string | null;
};

function taskAad(taskId: string) {
  return {
    table: "tasks" as const,
    recordId: taskId,
    field: "encrypted_blob" as const,
  };
}

export async function encryptTaskContent(
  workspaceKey: Uint8Array,
  taskId: string,
  content: TaskPlaintext,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(content)),
    aad: taskAad(taskId),
    keyVersion,
  });
}

export async function decryptTaskContent(
  workspaceKey: Uint8Array,
  taskId: string,
  envelope: CiphertextEnvelope,
): Promise<TaskPlaintext> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: taskAad(taskId),
  });
  return parseTaskPlaintext(JSON.parse(textDecoder.decode(bytes)));
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: TaskResponse,
): Promise<DecryptedTask> {
  let title = "Untitled";
  let body: TaskBodyDoc = EMPTY_TASK_BODY;
  try {
    const content = await decryptTaskContent(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    title = content.title;
    body = content.body;
  } catch {
    title = "Unable to decrypt";
  }
  return {
    id: row.id,
    projectId: row.projectId,
    workspaceId: row.workspaceId,
    title,
    body,
    labelId: row.labelId,
    stageId: row.stageId,
    priorityId: row.priorityId,
    links: row.links,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export async function loadDecryptedTasks(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  params?: ListTasksParams,
): Promise<{ tasks: DecryptedTask[]; nextCursor: string | null }> {
  const page = await listTasks(workspaceId, projectId, params);
  const tasks = await Promise.all(
    page.tasks.map((row) => toDecrypted(workspaceKey, row)),
  );
  return { tasks, nextCursor: page.nextCursor };
}

/** Load every page of tasks for a project (board / remap). */
export async function loadAllDecryptedTasks(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
): Promise<DecryptedTask[]> {
  const all: DecryptedTask[] = [];
  let cursor: string | null = null;
  do {
    const page = await loadDecryptedTasks(workspaceId, projectId, workspaceKey, {
      limit: 100,
      cursor,
    });
    all.push(...page.tasks);
    cursor = page.nextCursor;
  } while (cursor);
  return all;
}

export async function loadDecryptedTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  workspaceKey: Uint8Array,
): Promise<DecryptedTask> {
  const row = await getTask(workspaceId, projectId, taskId);
  return toDecrypted(workspaceKey, row);
}

export async function createTask(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  content: { title: string; body?: TaskBodyDoc; links?: EntityLinkTarget[] },
  sortOrder = 0,
  categorizations?: ProjectCategorizations,
): Promise<DecryptedTask> {
  const taskId = crypto.randomUUID();
  const plaintext = toTaskPlaintext(
    content.title,
    content.body ?? EMPTY_TASK_BODY,
  );
  const encryptedBlob = await encryptTaskContent(
    workspaceKey,
    taskId,
    plaintext,
  );
  const stageId = categorizations
    ? defaultStage(categorizations).id
    : undefined;
  const priorityId = categorizations
    ? defaultPriority(categorizations).id
    : undefined;
  const links =
    content.links ?? extractEntityRefsFromDoc(plaintext.body);
  const row = await putTask(workspaceId, projectId, taskId, {
    encryptedBlob,
    sortOrder,
    labelId: null,
    stageId,
    priorityId,
    links,
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveTask(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  task: DecryptedTask,
  content: TaskPlaintext,
  categorizationIds?: {
    labelId?: string | null;
    stageId?: string;
    priorityId?: string;
  },
  options?: {
    /** When omitted, links are extracted from the TipTap body. */
    links?: EntityLinkTarget[];
  },
): Promise<DecryptedTask> {
  const encryptedBlob = await encryptTaskContent(
    workspaceKey,
    task.id,
    content,
  );
  const links =
    options?.links !== undefined
      ? options.links
      : extractEntityRefsFromDoc(content.body);
  const row = await putTask(workspaceId, projectId, task.id, {
    encryptedBlob,
    sortOrder: task.sortOrder,
    deletedAt: task.deletedAt,
    labelId:
      categorizationIds?.labelId !== undefined
        ? categorizationIds.labelId
        : task.labelId,
    stageId:
      categorizationIds?.stageId !== undefined
        ? categorizationIds.stageId
        : (task.stageId ?? undefined),
    priorityId:
      categorizationIds?.priorityId !== undefined
        ? categorizationIds.priorityId
        : (task.priorityId ?? undefined),
    links,
  });
  return toDecrypted(workspaceKey, row);
}

/** Persist only categorization id columns (keeps ciphertext). */
export async function saveTaskCategorizationIds(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  task: DecryptedTask,
  ids: {
    labelId: string | null;
    stageId: string | null;
    priorityId: string | null;
  },
): Promise<DecryptedTask> {
  const encryptedBlob = await encryptTaskContent(
    workspaceKey,
    task.id,
    toTaskPlaintext(task.title, task.body),
  );
  const row = await putTask(workspaceId, projectId, task.id, {
    encryptedBlob,
    sortOrder: task.sortOrder,
    deletedAt: task.deletedAt,
    labelId: ids.labelId,
    stageId: ids.stageId ?? undefined,
    priorityId: ids.priorityId ?? undefined,
  });
  return toDecrypted(workspaceKey, row);
}

/**
 * Remap tasks after deleting an option or copying categorizations.
 * Loads all pages, updates matching tasks.
 */
export async function remapTasksForCategorizationChange(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  remap: (task: DecryptedTask) => {
    labelId: string | null;
    stageId: string | null;
    priorityId: string | null;
  } | null,
): Promise<void> {
  let cursor: string | null = null;
  do {
    const page = await loadDecryptedTasks(workspaceId, projectId, workspaceKey, {
      limit: 100,
      cursor,
    });
    for (const task of page.tasks) {
      const next = remap(task);
      if (!next) continue;
      if (
        next.labelId === task.labelId &&
        next.stageId === task.stageId &&
        next.priorityId === task.priorityId
      ) {
        continue;
      }
      await saveTaskCategorizationIds(
        workspaceId,
        projectId,
        workspaceKey,
        task,
        next,
      );
    }
    cursor = page.nextCursor;
  } while (cursor);
}

export async function deleteTask(
  workspaceId: string,
  projectId: string,
  task: DecryptedTask,
): Promise<void> {
  await deleteTaskApi(workspaceId, projectId, task.id);
}
