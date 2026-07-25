import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type { ProjectResponse } from "@helvety-cloud/api-contract";

import {
  deleteProject as deleteProjectApi,
  listProjects,
  putProject,
  type ListParams,
} from "@/lib/api/v1-client";

const textDecoder = new TextDecoder();

export type ProjectPlaintext = {
  name: string;
};

export type DecryptedProject = {
  id: string;
  workspaceId: string;
  name: string;
  sortOrder: number;
  updatedAt: string;
  deletedAt: string | null;
};

function projectAad(projectId: string) {
  return {
    table: "projects" as const,
    recordId: projectId,
    field: "encrypted_blob" as const,
  };
}

export async function encryptProjectName(
  workspaceKey: Uint8Array,
  projectId: string,
  name: string,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  const plaintext: ProjectPlaintext = { name: name.trim() };
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(plaintext)),
    aad: projectAad(projectId),
    keyVersion,
  });
}

export async function decryptProjectName(
  workspaceKey: Uint8Array,
  projectId: string,
  envelope: CiphertextEnvelope,
): Promise<string> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: projectAad(projectId),
  });
  const parsed = JSON.parse(textDecoder.decode(bytes)) as ProjectPlaintext;
  if (typeof parsed.name !== "string") {
    throw new Error("Invalid project plaintext");
  }
  return parsed.name;
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: ProjectResponse,
): Promise<DecryptedProject> {
  let name = "Untitled project";
  try {
    name = await decryptProjectName(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
  } catch {
    name = "Unable to decrypt";
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export async function loadDecryptedProjects(
  workspaceId: string,
  workspaceKey: Uint8Array,
  params?: ListParams,
): Promise<{ projects: DecryptedProject[]; nextCursor: string | null }> {
  const page = await listProjects(workspaceId, params);
  const projects = await Promise.all(
    page.projects.map((row) => toDecrypted(workspaceKey, row)),
  );
  return { projects, nextCursor: page.nextCursor };
}

export async function createProject(
  workspaceId: string,
  workspaceKey: Uint8Array,
  name: string,
  sortOrder = 0,
): Promise<DecryptedProject> {
  const projectId = crypto.randomUUID();
  const encryptedBlob = await encryptProjectName(
    workspaceKey,
    projectId,
    name,
  );
  const row = await putProject(workspaceId, projectId, {
    encryptedBlob,
    sortOrder,
  });
  return toDecrypted(workspaceKey, row);
}

export async function renameProject(
  workspaceId: string,
  workspaceKey: Uint8Array,
  project: DecryptedProject,
  name: string,
): Promise<DecryptedProject> {
  const encryptedBlob = await encryptProjectName(
    workspaceKey,
    project.id,
    name,
  );
  const row = await putProject(workspaceId, project.id, {
    encryptedBlob,
    sortOrder: project.sortOrder,
    deletedAt: project.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
}

/** Swap sortOrder with the neighbor and persist both. */
export async function reorderProjects(
  workspaceId: string,
  workspaceKey: Uint8Array,
  projects: DecryptedProject[],
  index: number,
  direction: "up" | "down",
): Promise<DecryptedProject[]> {
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= projects.length) {
    return projects;
  }
  const a = projects[index]!;
  const b = projects[swapWith]!;
  const aOrder = a.sortOrder;
  const bOrder = b.sortOrder;

  const [aBlob, bBlob] = await Promise.all([
    encryptProjectName(workspaceKey, a.id, a.name),
    encryptProjectName(workspaceKey, b.id, b.name),
  ]);

  const [aRow, bRow] = await Promise.all([
    putProject(workspaceId, a.id, {
      encryptedBlob: aBlob,
      sortOrder: bOrder,
      deletedAt: a.deletedAt,
    }),
    putProject(workspaceId, b.id, {
      encryptedBlob: bBlob,
      sortOrder: aOrder,
      deletedAt: b.deletedAt,
    }),
  ]);

  const next = [...projects];
  next[index] = await toDecrypted(workspaceKey, bRow);
  next[swapWith] = await toDecrypted(workspaceKey, aRow);
  // Keep visual list order aligned with sort_order after swap
  next.sort((x, y) => x.sortOrder - y.sortOrder || x.id.localeCompare(y.id));
  return next;
}

export async function deleteProject(
  workspaceId: string,
  project: DecryptedProject,
): Promise<void> {
  await deleteProjectApi(workspaceId, project.id);
}
