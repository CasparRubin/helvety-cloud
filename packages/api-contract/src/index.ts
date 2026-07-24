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
