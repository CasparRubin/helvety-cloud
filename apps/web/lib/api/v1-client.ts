import {
  apiErrorSchema,
  createWorkspaceRequestSchema,
  createWorkspaceResponseSchema,
  getMeCryptoResponseSchema,
  getWorkspaceResponseSchema,
  issueResponseSchema,
  projectResponseSchema,
  putIssueRequestSchema,
  putMeCryptoRequestSchema,
  putMeCryptoResponseSchema,
  putProjectRequestSchema,
  type CreateWorkspaceRequest,
  type CreateWorkspaceResponse,
  type GetMeCryptoResponse,
  type GetWorkspaceResponse,
  type IssueResponse,
  type ProjectResponse,
  type PutIssueRequest,
  type PutMeCryptoRequest,
  type PutMeCryptoResponse,
  type PutProjectRequest,
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

export async function getMeCrypto(): Promise<GetMeCryptoResponse> {
  return apiFetch("/api/v1/me/crypto", getMeCryptoResponseSchema);
}

export async function putMeCrypto(
  body: PutMeCryptoRequest,
): Promise<PutMeCryptoResponse> {
  return apiFetch("/api/v1/me/crypto", putMeCryptoResponseSchema, {
    method: "PUT",
    body: JSON.stringify(putMeCryptoRequestSchema.parse(body)),
  });
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
