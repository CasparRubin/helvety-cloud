import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type { TaskResponse } from "@helvety-cloud/api-contract";

import {
  deleteTask as deleteTaskApi,
  getTask,
  listTasks,
  putTask,
  type ListParams,
} from "@/lib/api/v1-client";
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
  const plaintext = toTaskPlaintext(content.title, content.body);
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(plaintext)),
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
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export async function loadDecryptedTasks(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  params?: ListParams,
): Promise<{ tasks: DecryptedTask[]; nextCursor: string | null }> {
  const page = await listTasks(workspaceId, projectId, params);
  const tasks = await Promise.all(
    page.tasks.map((row) => toDecrypted(workspaceKey, row)),
  );
  return { tasks, nextCursor: page.nextCursor };
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
  content: { title: string; body?: TaskBodyDoc },
  sortOrder = 0,
): Promise<DecryptedTask> {
  const taskId = crypto.randomUUID();
  const encryptedBlob = await encryptTaskContent(
    workspaceKey,
    taskId,
    toTaskPlaintext(content.title, content.body ?? EMPTY_TASK_BODY),
  );
  const row = await putTask(workspaceId, projectId, taskId, {
    encryptedBlob,
    sortOrder,
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveTask(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  task: DecryptedTask,
  content: TaskPlaintext,
): Promise<DecryptedTask> {
  const encryptedBlob = await encryptTaskContent(
    workspaceKey,
    task.id,
    content,
  );
  const row = await putTask(workspaceId, projectId, task.id, {
    encryptedBlob,
    sortOrder: task.sortOrder,
    deletedAt: task.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
}

export async function deleteTask(
  workspaceId: string,
  projectId: string,
  task: DecryptedTask,
): Promise<void> {
  await deleteTaskApi(workspaceId, projectId, task.id);
}
