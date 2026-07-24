import { z } from "zod";

export const PACKAGE_NAME = "@helvety-cloud/api-contract" as const;

/** Stable API error codes for /api/v1. */
export const apiErrorCodes = [
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "invalid_body",
  "invalid_ciphertext",
  "limit_exceeded",
  "internal",
] as const;

export const apiErrorCodeSchema = z.enum(apiErrorCodes);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

const base64UrlSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9_-]+$/, "expected base64url");

/** Versioned AES-GCM ciphertext (content or key_check). */
export const ciphertextEnvelopeSchema = z.object({
  v: z.literal(1),
  nonce: base64UrlSchema,
  ciphertext: base64UrlSchema,
  keyVersion: z.number().int().positive(),
});
export type CiphertextEnvelope = z.infer<typeof ciphertextEnvelopeSchema>;

/** Versioned AES-GCM wrapped key blob. */
export const wrappedKeyEnvelopeSchema = z.object({
  v: z.literal(1),
  nonce: base64UrlSchema,
  ciphertext: base64UrlSchema,
  keyVersion: z.number().int().positive(),
});
export type WrappedKeyEnvelope = z.infer<typeof wrappedKeyEnvelopeSchema>;

/** X25519-sealed key envelope. */
export const sealedKeyEnvelopeSchema = z.object({
  v: z.literal(1),
  ephemeralPublicKey: base64UrlSchema,
  nonce: base64UrlSchema,
  ciphertext: base64UrlSchema,
  keyVersion: z.number().int().positive(),
});
export type SealedKeyEnvelope = z.infer<typeof sealedKeyEnvelopeSchema>;

export const uuidSchema = z.string().uuid();

export const healthResponseSchema = z.object({
  ok: z.literal(true),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const putMeCryptoRequestSchema = z.object({
  publicKey: base64UrlSchema,
  wrappedUserKey: wrappedKeyEnvelopeSchema,
  wrappedPrivateKey: wrappedKeyEnvelopeSchema,
  prfSalt: base64UrlSchema,
  keyCheck: ciphertextEnvelopeSchema,
  keyVersion: z.number().int().positive().default(1),
});
export type PutMeCryptoRequest = z.infer<typeof putMeCryptoRequestSchema>;

export const putMeCryptoResponseSchema = z.object({
  userId: uuidSchema,
  keyVersion: z.number().int().positive(),
});
export type PutMeCryptoResponse = z.infer<typeof putMeCryptoResponseSchema>;

export const getMeCryptoResponseSchema = z.object({
  userId: uuidSchema,
  publicKey: base64UrlSchema,
  wrappedUserKey: wrappedKeyEnvelopeSchema,
  wrappedPrivateKey: wrappedKeyEnvelopeSchema,
  prfSalt: base64UrlSchema,
  keyCheck: ciphertextEnvelopeSchema,
  keyVersion: z.number().int().positive(),
});
export type GetMeCryptoResponse = z.infer<typeof getMeCryptoResponseSchema>;

export const workspaceKindSchema = z.enum(["personal", "standard"]);
export type WorkspaceKind = z.infer<typeof workspaceKindSchema>;

export const workspaceRoleSchema = z.enum(["owner", "admin", "member"]);
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

export const workspaceNameSchema = z.string().trim().min(1).max(120);

export const createWorkspaceRequestSchema = z.object({
  id: uuidSchema,
  name: workspaceNameSchema,
  kind: workspaceKindSchema.default("standard"),
  wrappedKey: sealedKeyEnvelopeSchema,
});
export type CreateWorkspaceRequest = z.infer<
  typeof createWorkspaceRequestSchema
>;

export const createWorkspaceResponseSchema = z.object({
  id: uuidSchema,
  name: workspaceNameSchema,
  kind: workspaceKindSchema,
});
export type CreateWorkspaceResponse = z.infer<
  typeof createWorkspaceResponseSchema
>;

export const workspaceListItemSchema = z.object({
  id: uuidSchema,
  name: workspaceNameSchema,
  kind: workspaceKindSchema,
  role: workspaceRoleSchema,
  wrappedKey: sealedKeyEnvelopeSchema,
  updatedAt: z.string(),
});
export type WorkspaceListItem = z.infer<typeof workspaceListItemSchema>;

export const listWorkspacesResponseSchema = z.object({
  workspaces: z.array(workspaceListItemSchema),
});
export type ListWorkspacesResponse = z.infer<
  typeof listWorkspacesResponseSchema
>;

export const getWorkspaceResponseSchema = z.object({
  id: uuidSchema,
  name: workspaceNameSchema,
  kind: workspaceKindSchema,
  wrappedKey: sealedKeyEnvelopeSchema,
});
export type GetWorkspaceResponse = z.infer<typeof getWorkspaceResponseSchema>;

export const patchWorkspaceRequestSchema = z.object({
  name: workspaceNameSchema,
});
export type PatchWorkspaceRequest = z.infer<typeof patchWorkspaceRequestSchema>;

export const patchWorkspaceResponseSchema = z.object({
  id: uuidSchema,
  name: workspaceNameSchema,
  kind: workspaceKindSchema,
});
export type PatchWorkspaceResponse = z.infer<
  typeof patchWorkspaceResponseSchema
>;

export const putProjectRequestSchema = z.object({
  encryptedBlob: ciphertextEnvelopeSchema,
  sortOrder: z.number().int().optional(),
  deletedAt: z.string().nullable().optional(),
});
export type PutProjectRequest = z.infer<typeof putProjectRequestSchema>;

export const projectResponseSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  encryptedBlob: ciphertextEnvelopeSchema,
  sortOrder: z.number().int(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type ProjectResponse = z.infer<typeof projectResponseSchema>;

export const putIssueRequestSchema = z.object({
  encryptedBlob: ciphertextEnvelopeSchema,
  sortOrder: z.number().int().optional(),
  deletedAt: z.string().nullable().optional(),
});
export type PutIssueRequest = z.infer<typeof putIssueRequestSchema>;

export const issueResponseSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  workspaceId: uuidSchema,
  encryptedBlob: ciphertextEnvelopeSchema,
  sortOrder: z.number().int(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type IssueResponse = z.infer<typeof issueResponseSchema>;

/** Shared list query: keyset cursor on (sort_order ASC, id ASC). */
export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).optional(),
  /** Query string `"true"` / `"false"`; omit = false. */
  includeDeleted: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});
export type ListQuery = {
  limit: number;
  cursor?: string;
  includeDeleted: boolean;
};

/** Opaque keyset cursor payload (encoded as base64url JSON on the wire). */
export const sortOrderCursorSchema = z.object({
  sortOrder: z.number().int(),
  id: uuidSchema,
});
export type SortOrderCursor = z.infer<typeof sortOrderCursorSchema>;

export const listProjectsResponseSchema = z.object({
  projects: z.array(projectResponseSchema),
  nextCursor: z.string().nullable(),
});
export type ListProjectsResponse = z.infer<typeof listProjectsResponseSchema>;

export const listIssuesResponseSchema = z.object({
  issues: z.array(issueResponseSchema),
  nextCursor: z.string().nullable(),
});
export type ListIssuesResponse = z.infer<typeof listIssuesResponseSchema>;

/** Signup-gated policy IDs (ToS, Privacy, AUP, E2EE acknowledgment). */
export const signupPolicyIds = ["tos", "privacy", "aup", "e2ee"] as const;
export const signupPolicyIdSchema = z.enum(signupPolicyIds);
export type SignupPolicyId = z.infer<typeof signupPolicyIdSchema>;

export const policyAcceptanceSchema = z.object({
  policy: signupPolicyIdSchema,
  version: z.string().min(1),
  acceptedAt: z.string(),
});
export type PolicyAcceptance = z.infer<typeof policyAcceptanceSchema>;

export const getMePolicyAcceptancesResponseSchema = z.object({
  currentVersions: z.object({
    tos: z.string().min(1),
    privacy: z.string().min(1),
    aup: z.string().min(1),
    e2ee: z.string().min(1),
  }),
  acceptances: z.array(policyAcceptanceSchema),
  missingPolicies: z.array(signupPolicyIdSchema),
  allCurrentAccepted: z.boolean(),
});
export type GetMePolicyAcceptancesResponse = z.infer<
  typeof getMePolicyAcceptancesResponseSchema
>;

export const putMePolicyAcceptancesRequestSchema = z.object({
  acceptances: z
    .array(
      z.object({
        policy: signupPolicyIdSchema,
        version: z.string().min(1),
      }),
    )
    .length(4),
});
export type PutMePolicyAcceptancesRequest = z.infer<
  typeof putMePolicyAcceptancesRequestSchema
>;

export const putMePolicyAcceptancesResponseSchema = z.object({
  acceptances: z.array(policyAcceptanceSchema),
  allCurrentAccepted: z.literal(true),
});
export type PutMePolicyAcceptancesResponse = z.infer<
  typeof putMePolicyAcceptancesResponseSchema
>;
