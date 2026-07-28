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
  isCategorizationIcon,
  type CategorizationIcon,
} from "@/lib/client-crypto/categorization-icons";
import {
  parseCategorizations,
  type WorkspaceCategorizations,
} from "@/lib/client-crypto/categorizations";
import {
  isEntityColor,
  type EntityColor,
} from "@/lib/client-crypto/entity-colors";
import {
  EMPTY_TASK_BODY,
  isTaskBodyDoc,
  type TaskBodyDoc,
} from "@/lib/client-crypto/task-plaintext";
import {
  comparePinned,
  movePinnedItem,
  nextPinSortOrder,
} from "@/lib/client-crypto/pins";

const textDecoder = new TextDecoder();

export type ProjectPlaintext = {
  name: string;
  description: TaskBodyDoc;
  color?: EntityColor;
  icon?: CategorizationIcon;
};

export type DecryptedProject = {
  id: string;
  workspaceId: string;
  name: string;
  description: TaskBodyDoc;
  color?: EntityColor;
  icon?: CategorizationIcon;
  sortOrder: number;
  isPinned: boolean;
  pinSortOrder: number | null;
  updatedAt: string;
  deletedAt: string | null;
};

const DEFAULT_PROJECT_ICON: CategorizationIcon = "folder-kanban";

export function resolveProjectIcon(
  icon?: CategorizationIcon,
): CategorizationIcon {
  return icon ?? DEFAULT_PROJECT_ICON;
}

export function projectPlaintextFrom(
  project: DecryptedProject,
  overrides?: Partial<ProjectPlaintext> & {
    clearColor?: boolean;
    clearIcon?: boolean;
  },
): ProjectPlaintext {
  const color = overrides?.clearColor
    ? undefined
    : overrides?.color !== undefined
      ? overrides.color
      : project.color;
  const icon = overrides?.clearIcon
    ? undefined
    : overrides?.icon !== undefined
      ? overrides.icon
      : project.icon;
  return {
    name: overrides?.name ?? project.name,
    description: overrides?.description ?? project.description,
    ...(color ? { color } : {}),
    ...(icon ? { icon } : {}),
  };
}

function projectAad(projectId: string) {
  return {
    table: "projects" as const,
    recordId: projectId,
    field: "encrypted_blob" as const,
  };
}

function parseDescription(value: unknown): TaskBodyDoc {
  if (!isTaskBodyDoc(value)) {
    throw new Error("Invalid project description");
  }
  return {
    type: "doc",
    content: value.content ?? [{ type: "paragraph" }],
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
    description: content.description,
    ...(content.color ? { color: content.color } : {}),
    ...(content.icon ? { icon: content.icon } : {}),
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
): Promise<ProjectPlaintext> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: projectAad(projectId),
  });
  const parsed = JSON.parse(textDecoder.decode(bytes)) as {
    name?: unknown;
    description?: unknown;
    color?: unknown;
    icon?: unknown;
  };
  if (typeof parsed.name !== "string") {
    throw new Error("Invalid project plaintext");
  }
  let color: EntityColor | undefined;
  if (parsed.color !== undefined && isEntityColor(parsed.color)) {
    color = parsed.color;
  }
  let icon: CategorizationIcon | undefined;
  if (parsed.icon !== undefined && isCategorizationIcon(parsed.icon)) {
    icon = parsed.icon;
  }
  const description = parseDescription(parsed.description);
  return {
    name: parsed.name,
    description,
    ...(color ? { color } : {}),
    ...(icon ? { icon } : {}),
  };
}

/** Read pre-move categorizations still nested in project ciphertext. */
export async function extractLegacyCategorizationsFromProject(
  workspaceKey: Uint8Array,
  projectId: string,
  envelope: CiphertextEnvelope,
): Promise<WorkspaceCategorizations | null> {
  try {
    const bytes = await decrypt({
      key: workspaceKey,
      envelope,
      aad: projectAad(projectId),
    });
    const parsed = JSON.parse(textDecoder.decode(bytes)) as {
      categorizations?: unknown;
    };
    return parseCategorizations(parsed.categorizations);
  } catch {
    return null;
  }
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: ProjectResponse,
): Promise<DecryptedProject> {
  let name = "Untitled project";
  let description: TaskBodyDoc = EMPTY_TASK_BODY;
  let color: EntityColor | undefined;
  let icon: CategorizationIcon | undefined;
  try {
    const plain = await decryptProjectPlaintext(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    name = plain.name;
    description = plain.description;
    color = plain.color;
    icon = plain.icon;
  } catch {
    name = "Unable to decrypt";
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name,
    description,
    color,
    icon,
    sortOrder: row.sortOrder,
    isPinned: row.isPinned,
    pinSortOrder: row.pinSortOrder,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
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
    isPinned: project.isPinned,
    pinSortOrder: project.pinSortOrder,
    deletedAt: project.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
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
  return toDecrypted(workspaceKey, row);
}

export async function createProject(
  workspaceId: string,
  workspaceKey: Uint8Array,
  name: string,
  sortOrder = 0,
  content?: {
    description?: TaskBodyDoc;
    color?: EntityColor;
    icon?: CategorizationIcon;
  },
): Promise<DecryptedProject> {
  const projectId = crypto.randomUUID();
  const encryptedBlob = await encryptProjectContent(workspaceKey, projectId, {
    name,
    description: content?.description ?? EMPTY_TASK_BODY,
    ...(content?.color ? { color: content.color } : {}),
    ...(content?.icon ? { icon: content.icon } : {}),
  });
  const row = await putProject(workspaceId, projectId, {
    encryptedBlob,
    sortOrder,
    isPinned: false,
    pinSortOrder: null,
  });
  return toDecrypted(workspaceKey, row);
}

export async function renameProject(
  workspaceId: string,
  workspaceKey: Uint8Array,
  project: DecryptedProject,
  name: string,
): Promise<DecryptedProject> {
  return saveProjectContent(
    workspaceId,
    workspaceKey,
    project,
    projectPlaintextFrom(project, { name }),
  );
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

  const [aExisting, bExisting] = await Promise.all([
    getProject(workspaceId, a.id),
    getProject(workspaceId, b.id),
  ]);

  const [aRow, bRow] = await Promise.all([
    putProject(workspaceId, a.id, {
      encryptedBlob: aExisting.encryptedBlob,
      sortOrder: bOrder,
      isPinned: aExisting.isPinned,
      pinSortOrder: aExisting.pinSortOrder,
      deletedAt: aExisting.deletedAt,
    }),
    putProject(workspaceId, b.id, {
      encryptedBlob: bExisting.encryptedBlob,
      sortOrder: aOrder,
      isPinned: bExisting.isPinned,
      pinSortOrder: bExisting.pinSortOrder,
      deletedAt: bExisting.deletedAt,
    }),
  ]);

  const next = [...projects];
  next[index] = await toDecrypted(workspaceKey, bRow);
  next[swapWith] = await toDecrypted(workspaceKey, aRow);
  next.sort((x, y) => x.sortOrder - y.sortOrder || x.id.localeCompare(y.id));
  return next;
}

export function sortProjectsForDisplay(
  projects: DecryptedProject[],
): DecryptedProject[] {
  return projects.slice().sort((a, b) => {
    const byPinned = comparePinned(a, b);
    if (byPinned !== 0) return byPinned;
    return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
  });
}

export async function setProjectPinned(
  workspaceId: string,
  workspaceKey: Uint8Array,
  projects: DecryptedProject[],
  project: DecryptedProject,
  pinned: boolean,
): Promise<DecryptedProject> {
  const existing = await getProject(workspaceId, project.id);
  const row = await putProject(workspaceId, project.id, {
    encryptedBlob: existing.encryptedBlob,
    sortOrder: existing.sortOrder,
    isPinned: pinned,
    pinSortOrder: pinned ? nextPinSortOrder(projects) : null,
    deletedAt: existing.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
}

export async function reorderPinnedProjects(
  workspaceId: string,
  workspaceKey: Uint8Array,
  projects: DecryptedProject[],
  projectId: string,
  direction: "up" | "down",
): Promise<DecryptedProject[]> {
  const next = movePinnedItem(projects, projectId, direction);
  if (next === projects) return projects;
  const previousById = new Map(
    projects.map((project) => [project.id, project]),
  );

  const changed = next.filter((project) => {
    const previous = previousById.get(project.id);
    return (
      previous?.pinSortOrder !== project.pinSortOrder ||
      previous.isPinned !== project.isPinned
    );
  });

  const rows = await Promise.all(
    changed.map(async (project) => {
      const existing = await getProject(workspaceId, project.id);
      return putProject(workspaceId, project.id, {
        encryptedBlob: existing.encryptedBlob,
        sortOrder: existing.sortOrder,
        isPinned: project.isPinned,
        pinSortOrder: project.pinSortOrder,
        deletedAt: existing.deletedAt,
      });
    }),
  );

  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return Promise.all(
    sortProjectsForDisplay(next).map(async (project) => {
      const row = rowsById.get(project.id);
      return row ? toDecrypted(workspaceKey, row) : project;
    }),
  );
}

export async function deleteProject(
  workspaceId: string,
  project: DecryptedProject,
): Promise<void> {
  await deleteProjectApi(workspaceId, project.id);
}
