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

export const createWorkspaceRequestSchema = z.object({
  id: uuidSchema,
  wrappedKey: sealedKeyEnvelopeSchema,
});
export type CreateWorkspaceRequest = z.infer<
  typeof createWorkspaceRequestSchema
>;

export const createWorkspaceResponseSchema = z.object({
  id: uuidSchema,
});
export type CreateWorkspaceResponse = z.infer<
  typeof createWorkspaceResponseSchema
>;

export const getWorkspaceResponseSchema = z.object({
  id: uuidSchema,
  wrappedKey: sealedKeyEnvelopeSchema,
});
export type GetWorkspaceResponse = z.infer<typeof getWorkspaceResponseSchema>;

export const putProjectRequestSchema = z.object({
  encryptedBlob: ciphertextEnvelopeSchema.nullable().optional(),
  sortOrder: z.number().int().optional(),
  deletedAt: z.string().nullable().optional(),
});
export type PutProjectRequest = z.infer<typeof putProjectRequestSchema>;

export const projectResponseSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  encryptedBlob: ciphertextEnvelopeSchema.nullable(),
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
