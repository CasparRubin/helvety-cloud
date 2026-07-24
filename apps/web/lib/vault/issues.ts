import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type { IssueResponse } from "@helvety-cloud/api-contract";

import {
  getIssue,
  listIssues,
  putIssue,
  type ListParams,
} from "@/lib/api/v1-client";
import {
  EMPTY_ISSUE_BODY,
  parseIssuePlaintext,
  toIssuePlaintext,
  type IssueBodyDoc,
  type IssuePlaintext,
} from "@/lib/vault/issue-plaintext";

export type { IssueBodyDoc, IssuePlaintext };
export { EMPTY_ISSUE_BODY, parseIssuePlaintext, toIssuePlaintext };

const textDecoder = new TextDecoder();

export type DecryptedIssue = {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  body: IssueBodyDoc;
  sortOrder: number;
  updatedAt: string;
  deletedAt: string | null;
};

function issueAad(issueId: string) {
  return {
    table: "issues" as const,
    recordId: issueId,
    field: "encrypted_blob" as const,
  };
}

export async function encryptIssueContent(
  workspaceKey: Uint8Array,
  issueId: string,
  content: IssuePlaintext,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  const plaintext = toIssuePlaintext(content.title, content.body);
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(plaintext)),
    aad: issueAad(issueId),
    keyVersion,
  });
}

export async function decryptIssueContent(
  workspaceKey: Uint8Array,
  issueId: string,
  envelope: CiphertextEnvelope,
): Promise<IssuePlaintext> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: issueAad(issueId),
  });
  return parseIssuePlaintext(JSON.parse(textDecoder.decode(bytes)));
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: IssueResponse,
): Promise<DecryptedIssue> {
  let title = "Untitled";
  let body: IssueBodyDoc = EMPTY_ISSUE_BODY;
  try {
    const content = await decryptIssueContent(
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

export async function loadDecryptedIssues(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  params?: ListParams,
): Promise<{ issues: DecryptedIssue[]; nextCursor: string | null }> {
  const page = await listIssues(workspaceId, projectId, params);
  const issues = await Promise.all(
    page.issues.map((row) => toDecrypted(workspaceKey, row)),
  );
  return { issues, nextCursor: page.nextCursor };
}

export async function loadDecryptedIssue(
  workspaceId: string,
  projectId: string,
  issueId: string,
  workspaceKey: Uint8Array,
): Promise<DecryptedIssue> {
  const row = await getIssue(workspaceId, projectId, issueId);
  return toDecrypted(workspaceKey, row);
}

export async function createIssue(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  content: { title: string; body?: IssueBodyDoc },
  sortOrder = 0,
): Promise<DecryptedIssue> {
  const issueId = crypto.randomUUID();
  const encryptedBlob = await encryptIssueContent(
    workspaceKey,
    issueId,
    toIssuePlaintext(content.title, content.body ?? EMPTY_ISSUE_BODY),
  );
  const row = await putIssue(workspaceId, projectId, issueId, {
    encryptedBlob,
    sortOrder,
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveIssue(
  workspaceId: string,
  projectId: string,
  workspaceKey: Uint8Array,
  issue: DecryptedIssue,
  content: IssuePlaintext,
): Promise<DecryptedIssue> {
  const encryptedBlob = await encryptIssueContent(
    workspaceKey,
    issue.id,
    content,
  );
  const row = await putIssue(workspaceId, projectId, issue.id, {
    encryptedBlob,
    sortOrder: issue.sortOrder,
    deletedAt: issue.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
}

export async function softDeleteIssue(
  workspaceId: string,
  projectId: string,
  issue: DecryptedIssue,
): Promise<void> {
  const existing = await getIssue(workspaceId, projectId, issue.id);
  await putIssue(workspaceId, projectId, issue.id, {
    encryptedBlob: existing.encryptedBlob,
    sortOrder: existing.sortOrder,
    deletedAt: new Date().toISOString(),
  });
}
