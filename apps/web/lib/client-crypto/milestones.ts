import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type { MilestoneResponse } from "@helvety-cloud/api-contract";

import {
  deleteMilestone as deleteMilestoneApi,
  listMilestones,
  putMilestone,
} from "@/lib/api/v1-client";
import {
  parseMilestonePlaintext,
  toMilestonePlaintext,
  type MilestonePlaintext,
} from "@/lib/client-crypto/milestone-plaintext";
import {
  EMPTY_TASK_BODY,
  type TaskBodyDoc,
} from "@/lib/client-crypto/task-plaintext";

const textDecoder = new TextDecoder();

export type DecryptedMilestone = {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description: TaskBodyDoc;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
  updatedAt: string;
  deletedAt: string | null;
};

function milestoneAad(milestoneId: string) {
  return {
    table: "milestones" as const,
    recordId: milestoneId,
    field: "encrypted_blob" as const,
  };
}

export async function encryptMilestoneContent(
  workspaceKey: Uint8Array,
  milestoneId: string,
  content: MilestonePlaintext,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(content)),
    aad: milestoneAad(milestoneId),
    keyVersion,
  });
}

export async function decryptMilestoneContent(
  workspaceKey: Uint8Array,
  milestoneId: string,
  envelope: CiphertextEnvelope,
): Promise<MilestonePlaintext> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: milestoneAad(milestoneId),
  });
  return parseMilestonePlaintext(JSON.parse(textDecoder.decode(bytes)));
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: MilestoneResponse,
): Promise<DecryptedMilestone> {
  let title = "Untitled milestone";
  let description: TaskBodyDoc = EMPTY_TASK_BODY;
  let startDate: string | null = null;
  let endDate: string | null = null;
  try {
    const content = await decryptMilestoneContent(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    title = content.title;
    description = content.description;
    startDate = content.startDate;
    endDate = content.endDate;
  } catch {
    title = "Unable to decrypt";
  }
  return {
    id: row.id,
    projectId: row.projectId,
    workspaceId: row.workspaceId,
    title,
    description,
    startDate,
    endDate,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

/** Sort by start date, then end date (nulls last), then sortOrder, then id. */
export function sortMilestones(
  milestones: DecryptedMilestone[],
): DecryptedMilestone[] {
  return [...milestones].sort((a, b) => {
    const byStart = compareNullableDates(a.startDate, b.startDate);
    if (byStart !== 0) return byStart;
    const byEnd = compareNullableDates(a.endDate, b.endDate);
    if (byEnd !== 0) return byEnd;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
}

function compareNullableDates(a: string | null, b: string | null): number {
  if (a && b) return a.localeCompare(b);
  if (a && !b) return -1;
  if (!a && b) return 1;
  return 0;
}

function formatIsoDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Display helper: `Jul 1 – Aug 1`, a single date, or `No dates`. */
export function formatMilestoneDateRange(
  startDate: string | null,
  endDate: string | null,
): string {
  if (startDate && endDate) {
    return `${formatIsoDateShort(startDate)} – ${formatIsoDateShort(endDate)}`;
  }
  if (startDate) return formatIsoDateShort(startDate);
  if (endDate) return formatIsoDateShort(endDate);
  return "No dates";
}

export async function loadAllDecryptedMilestones(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
): Promise<DecryptedMilestone[]> {
  const all: DecryptedMilestone[] = [];
  let cursor: string | null = null;
  do {
    const page = await listMilestones(workspaceId, projectId, {
      limit: 100,
      cursor,
    });
    const decrypted = await Promise.all(
      page.milestones.map((row) => toDecrypted(workspaceKey, row)),
    );
    all.push(...decrypted);
    cursor = page.nextCursor;
  } while (cursor);
  return sortMilestones(all);
}

export async function createMilestone(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  content: {
    title: string;
    description?: TaskBodyDoc;
    startDate?: string | null;
    endDate?: string | null;
  },
  sortOrder = 0,
): Promise<DecryptedMilestone> {
  const milestoneId = crypto.randomUUID();
  const plaintext = toMilestonePlaintext(
    content.title,
    content.description ?? EMPTY_TASK_BODY,
    content.startDate ?? null,
    content.endDate ?? null,
  );
  const encryptedBlob = await encryptMilestoneContent(
    workspaceKey,
    milestoneId,
    plaintext,
  );
  const row = await putMilestone(workspaceId, projectId, milestoneId, {
    encryptedBlob,
    sortOrder,
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveMilestone(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  milestone: DecryptedMilestone,
  content: {
    title: string;
    description: TaskBodyDoc;
    startDate: string | null;
    endDate: string | null;
  },
): Promise<DecryptedMilestone> {
  const plaintext = toMilestonePlaintext(
    content.title,
    content.description,
    content.startDate,
    content.endDate,
  );
  const encryptedBlob = await encryptMilestoneContent(
    workspaceKey,
    milestone.id,
    plaintext,
  );
  const row = await putMilestone(workspaceId, projectId, milestone.id, {
    encryptedBlob,
    sortOrder: milestone.sortOrder,
    deletedAt: milestone.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
}

export async function deleteMilestone(
  workspaceId: string,
  projectId: string,
  milestone: DecryptedMilestone,
): Promise<void> {
  await deleteMilestoneApi(workspaceId, projectId, milestone.id);
}
