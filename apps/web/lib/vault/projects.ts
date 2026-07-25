import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type { ProjectResponse } from "@helvety-cloud/api-contract";

import {
  deleteProject as deleteProjectApi,
  getProject,
  listProjects,
  putProject,
  type ListParams,
} from "@/lib/api/v1-client";
import {
  defaultCategorizations,
  parseCategorizations,
  type ProjectCategorizations,
} from "@/lib/vault/categorizations";
import {
  isEntityColor,
  type EntityColor,
} from "@/lib/vault/entity-colors";

const textDecoder = new TextDecoder();

export type ProjectPlaintext = {
  name: string;
  categorizations: ProjectCategorizations;
  color?: EntityColor;
};

export type DecryptedProject = {
  id: string;
  workspaceId: string;
  name: string;
  categorizations: ProjectCategorizations;
  color?: EntityColor;
  sortOrder: number;
  updatedAt: string;
  deletedAt: string | null;
  /** True when legacy blob lacked categorizations and needs a persist. */
  needsCategorizationPersist?: boolean;
};

function projectAad(projectId: string) {
  return {
    table: "projects" as const,
    recordId: projectId,
    field: "encrypted_blob" as const,
  };
}

export async function encryptProjectContent(
  workspaceKey: Uint8Array,
  projectId: string,
  content: ProjectPlaintext,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  const plaintext: ProjectPlaintext = {
    name: content.name.trim(),
    categorizations: content.categorizations,
    ...(content.color ? { color: content.color } : {}),
  };
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(plaintext)),
    aad: projectAad(projectId),
    keyVersion,
  });
}

export async function decryptProjectPlaintext(
  workspaceKey: Uint8Array,
  projectId: string,
  envelope: CiphertextEnvelope,
): Promise<{
  name: string;
  categorizations: ProjectCategorizations;
  color?: EntityColor;
  migrated: boolean;
}> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: projectAad(projectId),
  });
  const parsed = JSON.parse(textDecoder.decode(bytes)) as {
    name?: unknown;
    categorizations?: unknown;
    color?: unknown;
  };
  if (typeof parsed.name !== "string") {
    throw new Error("Invalid project plaintext");
  }
  let color: EntityColor | undefined;
  if (parsed.color !== undefined && isEntityColor(parsed.color)) {
    color = parsed.color;
  }
  const cats = parseCategorizations(parsed.categorizations);
  if (cats) {
    return {
      name: parsed.name,
      categorizations: cats,
      ...(color ? { color } : {}),
      migrated: false,
    };
  }
  return {
    name: parsed.name,
    categorizations: defaultCategorizations(),
    ...(color ? { color } : {}),
    migrated: true,
  };
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: ProjectResponse,
): Promise<DecryptedProject> {
  let name = "Untitled project";
  let categorizations = defaultCategorizations();
  let color: EntityColor | undefined;
  let needsCategorizationPersist = false;
  try {
    const plain = await decryptProjectPlaintext(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    name = plain.name;
    categorizations = plain.categorizations;
    color = plain.color;
    needsCategorizationPersist = plain.migrated;
  } catch {
    name = "Unable to decrypt";
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name,
    categorizations,
    color,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    needsCategorizationPersist,
  };
}

/** Persist injected defaults for legacy projects (stable option ids). */
export async function ensureProjectCategorizations(
  workspaceId: string,
  workspaceKey: Uint8Array,
  project: DecryptedProject,
): Promise<DecryptedProject> {
  if (!project.needsCategorizationPersist) return project;
  return saveProjectContent(workspaceId, workspaceKey, project, {
    name: project.name,
    categorizations: project.categorizations,
    ...(project.color ? { color: project.color } : {}),
  });
}

export async function saveProjectContent(
  workspaceId: string,
  workspaceKey: Uint8Array,
  project: DecryptedProject,
  content: ProjectPlaintext,
): Promise<DecryptedProject> {
  const encryptedBlob = await encryptProjectContent(
    workspaceKey,
    project.id,
    content,
  );
  const row = await putProject(workspaceId, project.id, {
    encryptedBlob,
    sortOrder: project.sortOrder,
    deletedAt: project.deletedAt,
  });
  const decrypted = await toDecrypted(workspaceKey, row);
  return { ...decrypted, needsCategorizationPersist: false };
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

export async function loadDecryptedProject(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
): Promise<DecryptedProject> {
  const row = await getProject(workspaceId, projectId);
  const project = await toDecrypted(workspaceKey, row);
  return ensureProjectCategorizations(workspaceId, workspaceKey, project);
}

export async function createProject(
  workspaceId: string,
  workspaceKey: Uint8Array,
  name: string,
  sortOrder = 0,
): Promise<DecryptedProject> {
  const projectId = crypto.randomUUID();
  const encryptedBlob = await encryptProjectContent(
    workspaceKey,
    projectId,
    { name, categorizations: defaultCategorizations() },
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
  return saveProjectContent(workspaceId, workspaceKey, project, {
    name,
    categorizations: project.categorizations,
  });
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
    encryptProjectContent(workspaceKey, a.id, {
      name: a.name,
      categorizations: a.categorizations,
    }),
    encryptProjectContent(workspaceKey, b.id, {
      name: b.name,
      categorizations: b.categorizations,
    }),
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
  next.sort((x, y) => x.sortOrder - y.sortOrder || x.id.localeCompare(y.id));
  return next;
}

export async function deleteProject(
  workspaceId: string,
  project: DecryptedProject,
): Promise<void> {
  await deleteProjectApi(workspaceId, project.id);
}
