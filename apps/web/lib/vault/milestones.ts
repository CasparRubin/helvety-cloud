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
} from "@/lib/vault/milestone-plaintext";
import {
  EMPTY_TASK_BODY,
  type TaskBodyDoc,
} from "@/lib/vault/task-plaintext";

const textDecoder = new TextDecoder();

export type DecryptedMilestone = {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description: TaskBodyDoc;
  targetDate: string | null;
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
  let targetDate: string | null = null;
  try {
    const content = await decryptMilestoneContent(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    title = content.title;
    description = content.description;
    targetDate = content.targetDate;
  } catch {
    title = "Unable to decrypt";
  }
  return {
    id: row.id,
    projectId: row.projectId,
    workspaceId: row.workspaceId,
    title,
    description,
    targetDate,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

/** Sort by target date ascending (nulls last), then sortOrder, then id. */
export function sortMilestones(
  milestones: DecryptedMilestone[],
): DecryptedMilestone[] {
  return [...milestones].sort((a, b) => {
    if (a.targetDate && b.targetDate) {
      const byDate = a.targetDate.localeCompare(b.targetDate);
      if (byDate !== 0) return byDate;
    } else if (a.targetDate && !b.targetDate) {
      return -1;
    } else if (!a.targetDate && b.targetDate) {
      return 1;
    }
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
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
    targetDate?: string | null;
  },
  sortOrder = 0,
): Promise<DecryptedMilestone> {
  const milestoneId = crypto.randomUUID();
  const plaintext = toMilestonePlaintext(
    content.title,
    content.description ?? EMPTY_TASK_BODY,
    content.targetDate ?? null,
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
    targetDate: string | null;
  },
): Promise<DecryptedMilestone> {
  const plaintext = toMilestonePlaintext(
    content.title,
    content.description,
    content.targetDate,
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
