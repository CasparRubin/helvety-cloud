import {
  apiErrorSchema,
  billingRedirectResponseSchema,
  contactResponseSchema,
  createWorkspaceInvitationRequestSchema,
  createWorkspaceRequestSchema,
  createWorkspaceResponseSchema,
  getMeCryptoResponseSchema,
  getMePolicyAcceptancesResponseSchema,
  getWorkspaceBillingResponseSchema,
  getWorkspaceResponseSchema,
  issueResponseSchema,
  listContactsResponseSchema,
  listIssuesResponseSchema,
  listMyInvitationsResponseSchema,
  listNotesResponseSchema,
  listProjectsResponseSchema,
  listWorkspaceInvitationsResponseSchema,
  listWorkspaceMembersResponseSchema,
  listWorkspacesResponseSchema,
  noteResponseSchema,
  patchWorkspaceRequestSchema,
  patchWorkspaceResponseSchema,
  projectResponseSchema,
  putContactRequestSchema,
  putIssueRequestSchema,
  putMeCryptoRequestSchema,
  putMeCryptoResponseSchema,
  putMePolicyAcceptancesRequestSchema,
  putMePolicyAcceptancesResponseSchema,
  putNoteRequestSchema,
  putProjectRequestSchema,
  sealWorkspaceInvitationRequestSchema,
  workspaceInvitationSchema,
  type BillingRedirectResponse,
  type ContactResponse,
  type CreateWorkspaceInvitationRequest,
  type CreateWorkspaceRequest,
  type CreateWorkspaceResponse,
  type GetMeCryptoResponse,
  type GetMePolicyAcceptancesResponse,
  type GetWorkspaceBillingResponse,
  type GetWorkspaceResponse,
  type IssueResponse,
  type ListContactsResponse,
  type ListIssuesResponse,
  type ListMyInvitationsResponse,
  type ListNotesResponse,
  type ListProjectsResponse,
  type ListWorkspaceInvitationsResponse,
  type ListWorkspaceMembersResponse,
  type ListWorkspacesResponse,
  type NoteResponse,
  type PatchWorkspaceRequest,
  type PatchWorkspaceResponse,
  type ProjectResponse,
  type PutContactRequest,
  type PutIssueRequest,
  type PutMeCryptoRequest,
  type PutMeCryptoResponse,
  type PutMePolicyAcceptancesRequest,
  type PutMePolicyAcceptancesResponse,
  type PutNoteRequest,
  type PutProjectRequest,
  type SealWorkspaceInvitationRequest,
  type WorkspaceInvitation,
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

export async function getWorkspace(
  workspaceId: string,
): Promise<GetWorkspaceResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}`,
    getWorkspaceResponseSchema,
  );
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

function listQuery(params?: ListParams): string {
  const q = new URLSearchParams();
  if (params?.limit !== undefined) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.includeDeleted) q.set("includeDeleted", "true");
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

export async function listIssues(
  workspaceId: string,
  projectId: string,
  params?: ListParams,
): Promise<ListIssuesResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/issues${listQuery(params)}`,
    listIssuesResponseSchema,
  );
}

export async function putIssue(
  workspaceId: string,
  projectId: string,
  issueId: string,
  body: PutIssueRequest,
): Promise<IssueResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`,
    issueResponseSchema,
    {
      method: "PUT",
      body: JSON.stringify(putIssueRequestSchema.parse(body)),
    },
  );
}

export async function getIssue(
  workspaceId: string,
  projectId: string,
  issueId: string,
): Promise<IssueResponse> {
  return apiFetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`,
    issueResponseSchema,
  );
}

export async function deleteIssue(
  workspaceId: string,
  projectId: string,
  issueId: string,
): Promise<void> {
  await apiFetchNoContent(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`,
    { method: "DELETE" },
  );
}

export type ListNotesParams = ListParams & {
  projectId?: string | null;
  issueId?: string | null;
};

function notesListQuery(params?: ListNotesParams): string {
  const q = new URLSearchParams();
  if (params?.limit !== undefined) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  if (params?.includeDeleted) q.set("includeDeleted", "true");
  if (params?.projectId) q.set("projectId", params.projectId);
  if (params?.issueId) q.set("issueId", params.issueId);
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
