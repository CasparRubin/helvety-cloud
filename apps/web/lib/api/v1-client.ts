import {
  apiErrorSchema,
  billingRedirectResponseSchema,
  contactResponseSchema,
  commentResponseSchema,
  createWorkspaceInvitationRequestSchema,
  createWorkspaceRequestSchema,
  createWorkspaceResponseSchema,
  getMeAccountResponseSchema,
  getMeCryptoResponseSchema,
  getMePolicyAcceptancesResponseSchema,
  getWorkspaceBillingResponseSchema,
  taskResponseSchema,
  listContactsResponseSchema,
  listCommentsResponseSchema,
  listTasksResponseSchema,
  listMilestonesResponseSchema,
  listMyInvitationsResponseSchema,
  listNotesResponseSchema,
  listEntityLinksResponseSchema,
  listProjectsResponseSchema,
  milestoneResponseSchema,
  listWorkspaceInvitationsResponseSchema,
  listWorkspaceMembersResponseSchema,
  listWorkspacesResponseSchema,
  noteResponseSchema,
  patchWorkspaceRequestSchema,
  patchWorkspaceResponseSchema,
  projectResponseSchema,
  putContactRequestSchema,
  putCommentRequestSchema,
  putTaskRequestSchema,
  putMilestoneRequestSchema,
  putMeCryptoRequestSchema,
  putMeCryptoResponseSchema,
  putMePolicyAcceptancesRequestSchema,
  putMePolicyAcceptancesResponseSchema,
  putNoteRequestSchema,
  putProjectRequestSchema,
  sealWorkspaceInvitationRequestSchema,
  workspaceInvitationSchema,
  createAttachmentRequestSchema,
  createAttachmentResponseSchema,
  completeAttachmentResponseSchema,
  downloadAttachmentResponseSchema,
  attachmentResponseSchema,
  type BillingRedirectResponse,
  type ContactResponse,
  type CommentResponse,
  type CommentParentKind,
  type CreateWorkspaceInvitationRequest,
  type CreateWorkspaceRequest,
  type CreateWorkspaceResponse,
  type GetMeAccountResponse,
  type GetMeCryptoResponse,
  type GetMePolicyAcceptancesResponse,
  type GetWorkspaceBillingResponse,
  type TaskResponse,
  type ListContactsResponse,
  type ListCommentsResponse,
  type ListTasksResponse,
  type ListMilestonesResponse,
  type ListMyInvitationsResponse,
  type ListNotesResponse,
  type ListEntityLinksResponse,
  type ListProjectsResponse,
  type ListWorkspaceInvitationsResponse,
  type ListWorkspaceMembersResponse,
  type ListWorkspacesResponse,
  type NoteResponse,
  type PatchWorkspaceRequest,
  type PatchWorkspaceResponse,
  type ProjectResponse,
  type MilestoneResponse,
  type PutContactRequest,
  type PutCommentRequest,
  type PutTaskRequest,
  type PutMilestoneRequest,
  type PutMeCryptoRequest,
  type PutMeCryptoResponse,
  type PutMePolicyAcceptancesRequest,
  type PutMePolicyAcceptancesResponse,
  type PutNoteRequest,
  type PutProjectRequest,
  type SealWorkspaceInvitationRequest,
  type WorkspaceInvitation,
  type CreateAttachmentRequest,
  type CreateAttachmentResponse,
  type CompleteAttachmentResponse,
  type DownloadAttachmentResponse,
  type AttachmentResponse,
} from "@helvety-cloud/api-contract";

import { createClient } from "@/lib/supabase/client";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

type Parsable<T> = {
  parse: (data: unknown) => T;
};

async function accessToken(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ApiClientError("unauthorized", "Not signed in", 401);
  }
  return data.session.access_token;
}

async function apiFetch<T>(
  path: string,
  schema: Parsable<T>,
  init?: RequestInit,
): Promise<T> {
  const token = await accessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    if (parsed.success) {
      throw new ApiClientError(
        parsed.data.error.code,
        parsed.data.error.message,
        response.status,
      );
    }
    throw new ApiClientError(
      "internal",
      `Request failed (${response.status})`,
      response.status,
    );
  }

  return schema.parse(body);
}

async function apiFetchNoContent(
  path: string,
  init?: RequestInit,
): Promise<void> {
  const token = await accessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (response.ok) {
    return;
  }

  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(body);
  if (parsed.success) {
    throw new ApiClientError(
      parsed.data.error.code,
      parsed.data.error.message,
      response.status,
    );
  }
  throw new ApiClientError(
    "internal",
    `Request failed (${response.status})`,
    response.status,
  );
}

export async function getMeCrypto(): Promise<GetMeCryptoResponse> {
  return apiFetch("/api/v1/me/crypto", getMeCryptoResponseSchema);
}

export async function getMeAccount(): Promise<GetMeAccountResponse> {
  return apiFetch("/api/v1/me", getMeAccountResponseSchema);
}

export async function deleteAccount(): Promise<void> {
  await apiFetchNoContent("/api/v1/me", {
    method: "DELETE",
  });
}

export async function getMePolicyAcceptances(): Promise<GetMePolicyAcceptancesResponse> {
  return apiFetch(
    "/api/v1/me/policy-acceptances",
    getMePolicyAcceptancesResponseSchema,
  );
}

export async function putMePolicyAcceptances(
  body: PutMePolicyAcceptancesRequest,
): Promise<PutMePolicyAcceptancesResponse> {
  return apiFetch(
    "/api/v1/me/policy-acceptances",
    putMePolicyAcceptancesResponseSchema,
    {
      method: "PUT",
      body: JSON.stringify(putMePolicyAcceptancesRequestSchema.parse(body)),
    },
  );
}

export async function putMeCrypto(
  body: PutMeCryptoRequest,
): Promise<PutMeCryptoResponse> {
  return apiFetch("/api/v1/me/crypto", putMeCryptoResponseSchema, {
    method: "PUT",
    body: JSON.stringify(putMeCryptoRequestSchema.parse(body)),
  });
}

export async function listWorkspaces(): Promise<ListWorkspacesResponse> {
  return apiFetch("/api/v1/workspaces", listWorkspacesResponseSchema);
}

export async function createWorkspace(
  body: CreateWorkspaceRequest,
): Promise<CreateWorkspaceResponse> {
  return apiFetch("/api/v1/workspaces", createWorkspaceResponseSchema, {
    method: "POST",
    body: JSON.stringify(createWorkspaceRequestSchema.parse(body)),
  });
}

export async function patchWorkspace(
  workspaceId: string,
  body: PatchWorkspaceRequest,
): Promise<PatchWorkspaceResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}`,
    patchWorkspaceResponseSchema,
    {
      method: "PATCH",
      body: JSON.stringify(patchWorkspaceRequestSchema.parse(body)),
    },
  );
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await apiFetchNoContent(`/api/v1/workspaces/${workspaceId}`, {
    method: "DELETE",
  });
}

export type ListParams = {
  limit?: number;
  cursor?: string | null;
  includeDeleted?: boolean;
};

export type ListTasksParams = ListParams & {
  labelId?: string;
  stageId?: string;
  priorityId?: string;
  milestoneId?: string;
};

function listQuery(params?: ListParams): string {
  const q = new URLSearchParams();
  if (params?.limit !== undefined) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.includeDeleted) q.set("includeDeleted", "true");
  const s = q.toString();
  return s ? `?${s}` : "";
}

function tasksListQuery(params?: ListTasksParams): string {
  const q = new URLSearchParams();
  if (params?.limit !== undefined) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.includeDeleted) q.set("includeDeleted", "true");
  if (params?.labelId) q.set("labelId", params.labelId);
  if (params?.stageId) q.set("stageId", params.stageId);
  if (params?.priorityId) q.set("priorityId", params.priorityId);
  if (params?.milestoneId) q.set("milestoneId", params.milestoneId);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function listProjects(
  workspaceId: string,
  params?: ListParams,
): Promise<ListProjectsResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/projects${listQuery(params)}`,
    listProjectsResponseSchema,
  );
}

export async function getProject(
  workspaceId: string,
  projectId: string,
): Promise<ProjectResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
    projectResponseSchema,
  );
}

export async function putProject(
  workspaceId: string,
  projectId: string,
  body: PutProjectRequest,
): Promise<ProjectResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
    projectResponseSchema,
    {
      method: "PUT",
      body: JSON.stringify(putProjectRequestSchema.parse(body)),
    },
  );
}

export async function deleteProject(
  workspaceId: string,
  projectId: string,
): Promise<void> {
  await apiFetchNoContent(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
    { method: "DELETE" },
  );
}

export async function listTasks(
  workspaceId: string,
  projectId: string,
  params?: ListTasksParams,
): Promise<ListTasksResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/tasks${tasksListQuery(params)}`,
    listTasksResponseSchema,
  );
}

export async function listWorkspaceTasks(
  workspaceId: string,
  params?: ListTasksParams & { projectId?: string },
): Promise<ListTasksResponse> {
  const q = new URLSearchParams();
  if (params?.limit !== undefined) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.includeDeleted) q.set("includeDeleted", "true");
  if (params?.labelId) q.set("labelId", params.labelId);
  if (params?.stageId) q.set("stageId", params.stageId);
  if (params?.priorityId) q.set("priorityId", params.priorityId);
  if (params?.milestoneId) q.set("milestoneId", params.milestoneId);
  if (params?.projectId) q.set("projectId", params.projectId);
  const qs = q.toString();
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/tasks${qs ? `?${qs}` : ""}`,
    listTasksResponseSchema,
  );
}

export async function putTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  body: PutTaskRequest,
): Promise<TaskResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
    taskResponseSchema,
    {
      method: "PUT",
      body: JSON.stringify(putTaskRequestSchema.parse(body)),
    },
  );
}

export async function getTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
    taskResponseSchema,
  );
}

export async function deleteTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  await apiFetchNoContent(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
    { method: "DELETE" },
  );
}

export async function listMilestones(
  workspaceId: string,
  projectId: string,
  params?: ListParams,
): Promise<ListMilestonesResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/milestones${listQuery(params)}`,
    listMilestonesResponseSchema,
  );
}

export async function putMilestone(
  workspaceId: string,
  projectId: string,
  milestoneId: string,
  body: PutMilestoneRequest,
): Promise<MilestoneResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/milestones/${milestoneId}`,
    milestoneResponseSchema,
    {
      method: "PUT",
      body: JSON.stringify(putMilestoneRequestSchema.parse(body)),
    },
  );
}

export async function deleteMilestone(
  workspaceId: string,
  projectId: string,
  milestoneId: string,
): Promise<void> {
  await apiFetchNoContent(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/milestones/${milestoneId}`,
    { method: "DELETE" },
  );
}

export type ListNotesParams = ListParams & {
  projectId?: string | null;
  taskId?: string | null;
};

function notesListQuery(params?: ListNotesParams): string {
  const q = new URLSearchParams();
  if (params?.limit !== undefined) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.includeDeleted) q.set("includeDeleted", "true");
  if (params?.projectId) q.set("projectId", params.projectId);
  if (params?.taskId) q.set("taskId", params.taskId);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function listNotes(
  workspaceId: string,
  params?: ListNotesParams,
): Promise<ListNotesResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/notes${notesListQuery(params)}`,
    listNotesResponseSchema,
  );
}

export async function getNote(
  workspaceId: string,
  noteId: string,
): Promise<NoteResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/notes/${noteId}`,
    noteResponseSchema,
  );
}

export async function putNote(
  workspaceId: string,
  noteId: string,
  body: PutNoteRequest,
): Promise<NoteResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/notes/${noteId}`,
    noteResponseSchema,
    {
      method: "PUT",
      body: JSON.stringify(putNoteRequestSchema.parse(body)),
    },
  );
}

export async function deleteNote(
  workspaceId: string,
  noteId: string,
): Promise<void> {
  await apiFetchNoContent(
    `/api/v1/workspaces/${workspaceId}/notes/${noteId}`,
    { method: "DELETE" },
  );
}

export type ListEntityLinksParams = {
  sourceKind?: string;
  sourceId?: string;
  targetKind?: string;
  targetId?: string;
};

export async function listEntityLinks(
  workspaceId: string,
  params: ListEntityLinksParams,
): Promise<ListEntityLinksResponse> {
  const q = new URLSearchParams();
  if (params.sourceKind) q.set("sourceKind", params.sourceKind);
  if (params.sourceId) q.set("sourceId", params.sourceId);
  if (params.targetKind) q.set("targetKind", params.targetKind);
  if (params.targetId) q.set("targetId", params.targetId);
  const qs = q.toString();
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/links${qs ? `?${qs}` : ""}`,
    listEntityLinksResponseSchema,
  );
}

export async function listContacts(
  workspaceId: string,
  params?: ListParams,
): Promise<ListContactsResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/contacts${listQuery(params)}`,
    listContactsResponseSchema,
  );
}

export async function getContact(
  workspaceId: string,
  contactId: string,
): Promise<ContactResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/contacts/${contactId}`,
    contactResponseSchema,
  );
}

export async function putContact(
  workspaceId: string,
  contactId: string,
  body: PutContactRequest,
): Promise<ContactResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/contacts/${contactId}`,
    contactResponseSchema,
    {
      method: "PUT",
      body: JSON.stringify(putContactRequestSchema.parse(body)),
    },
  );
}

export async function deleteContact(
  workspaceId: string,
  contactId: string,
): Promise<void> {
  await apiFetchNoContent(
    `/api/v1/workspaces/${workspaceId}/contacts/${contactId}`,
    { method: "DELETE" },
  );
}

export type ListCommentsParams = {
  parentKind: CommentParentKind;
  parentId: string;
  includeDeleted?: boolean;
};

export async function listComments(
  workspaceId: string,
  params: ListCommentsParams,
): Promise<ListCommentsResponse> {
  const q = new URLSearchParams({
    parentKind: params.parentKind,
    parentId: params.parentId,
  });
  if (params.includeDeleted) q.set("includeDeleted", "true");
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/comments?${q.toString()}`,
    listCommentsResponseSchema,
  );
}

export async function putComment(
  workspaceId: string,
  commentId: string,
  body: PutCommentRequest,
): Promise<CommentResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/comments/${commentId}`,
    commentResponseSchema,
    {
      method: "PUT",
      body: JSON.stringify(putCommentRequestSchema.parse(body)),
    },
  );
}

export async function deleteComment(
  workspaceId: string,
  commentId: string,
): Promise<void> {
  await apiFetchNoContent(
    `/api/v1/workspaces/${workspaceId}/comments/${commentId}`,
    { method: "DELETE" },
  );
}

export async function listWorkspaceInvitations(
  workspaceId: string,
): Promise<ListWorkspaceInvitationsResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/invitations`,
    listWorkspaceInvitationsResponseSchema,
  );
}

export async function createWorkspaceInvitation(
  workspaceId: string,
  body: CreateWorkspaceInvitationRequest,
): Promise<WorkspaceInvitation> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/invitations`,
    workspaceInvitationSchema,
    {
      method: "POST",
      body: JSON.stringify(createWorkspaceInvitationRequestSchema.parse(body)),
    },
  );
}

export async function sealWorkspaceInvitation(
  workspaceId: string,
  invitationId: string,
  body: SealWorkspaceInvitationRequest,
): Promise<WorkspaceInvitation> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/invitations/${invitationId}/seal`,
    workspaceInvitationSchema,
    {
      method: "POST",
      body: JSON.stringify(sealWorkspaceInvitationRequestSchema.parse(body)),
    },
  );
}

export async function cancelWorkspaceInvitation(
  workspaceId: string,
  invitationId: string,
): Promise<WorkspaceInvitation> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/invitations/${invitationId}/cancel`,
    workspaceInvitationSchema,
    { method: "POST" },
  );
}

export async function listWorkspaceMembers(
  workspaceId: string,
): Promise<ListWorkspaceMembersResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/members`,
    listWorkspaceMembersResponseSchema,
  );
}

export async function getWorkspaceBilling(
  workspaceId: string,
): Promise<GetWorkspaceBillingResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/billing`,
    getWorkspaceBillingResponseSchema,
  );
}

export async function createBillingCheckout(
  workspaceId: string,
): Promise<BillingRedirectResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/billing/checkout`,
    billingRedirectResponseSchema,
    { method: "POST" },
  );
}

export async function createBillingPortal(
  workspaceId: string,
): Promise<BillingRedirectResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/billing/portal`,
    billingRedirectResponseSchema,
    { method: "POST" },
  );
}

export async function syncWorkspaceBilling(
  workspaceId: string,
): Promise<GetWorkspaceBillingResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/billing/sync`,
    getWorkspaceBillingResponseSchema,
    { method: "POST" },
  );
}

export async function listMyInvitations(): Promise<ListMyInvitationsResponse> {
  return apiFetch("/api/v1/me/invitations", listMyInvitationsResponseSchema);
}

export async function claimInvitation(
  invitationId: string,
): Promise<WorkspaceInvitation> {
  return apiFetch(
    `/api/v1/me/invitations/${invitationId}/claim`,
    workspaceInvitationSchema,
    { method: "POST" },
  );
}

export async function acceptInvitation(
  invitationId: string,
): Promise<WorkspaceInvitation> {
  return apiFetch(
    `/api/v1/me/invitations/${invitationId}/accept`,
    workspaceInvitationSchema,
    { method: "POST" },
  );
}

export async function createAttachment(
  workspaceId: string,
  body: CreateAttachmentRequest,
): Promise<CreateAttachmentResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/attachments`,
    createAttachmentResponseSchema,
    {
      method: "POST",
      body: JSON.stringify(createAttachmentRequestSchema.parse(body)),
    },
  );
}

export async function completeAttachment(
  workspaceId: string,
  attachmentId: string,
): Promise<CompleteAttachmentResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/attachments/${attachmentId}/complete`,
    completeAttachmentResponseSchema,
    { method: "POST" },
  );
}

export async function downloadAttachment(
  workspaceId: string,
  attachmentId: string,
): Promise<DownloadAttachmentResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/attachments/${attachmentId}/download`,
    downloadAttachmentResponseSchema,
  );
}

export async function getAttachment(
  workspaceId: string,
  attachmentId: string,
): Promise<AttachmentResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/attachments/${attachmentId}`,
    attachmentResponseSchema,
  );
}

export async function deleteAttachment(
  workspaceId: string,
  attachmentId: string,
): Promise<void> {
  await apiFetchNoContent(
    `/api/v1/workspaces/${workspaceId}/attachments/${attachmentId}`,
    { method: "DELETE" },
  );
}
