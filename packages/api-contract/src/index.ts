import { z } from "zod";

/** Stable API error codes for /api/v1. */
export const apiErrorCodes = [
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "invalid_body",
  "invalid_ciphertext",
  "limit_exceeded",
  "rate_limited",
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

/** Entity kinds that can appear in entity_links (P8a). */
export const entityLinkKinds = [
  "note",
  "task",
  "contact",
  "project",
] as const;
export const entityLinkKindSchema = z.enum(entityLinkKinds);
export type EntityLinkKind = z.infer<typeof entityLinkKindSchema>;

const allowedEntityLinkTargets = {
  note: ["task", "contact", "project"],
  task: ["note", "contact"],
  contact: ["note", "project", "task"],
  project: [],
} as const satisfies Record<EntityLinkKind, readonly EntityLinkKind[]>;

export function allowedLinkTargetKinds(
  sourceKind: EntityLinkKind,
): readonly EntityLinkKind[] {
  return allowedEntityLinkTargets[sourceKind];
}

export function isAllowedLinkPair(
  sourceKind: EntityLinkKind,
  targetKind: EntityLinkKind,
): boolean {
  return allowedLinkTargetKinds(sourceKind).some((kind) => kind === targetKind);
}

export const entityLinkTargetSchema = z.object({
  kind: entityLinkKindSchema,
  id: uuidSchema,
});
export type EntityLinkTarget = z.infer<typeof entityLinkTargetSchema>;

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
  encryptedBlob: ciphertextEnvelopeSchema,
  kind: workspaceKindSchema.default("standard"),
  wrappedKey: sealedKeyEnvelopeSchema,
});
export type CreateWorkspaceRequest = z.infer<
  typeof createWorkspaceRequestSchema
>;

export const createWorkspaceResponseSchema = z.object({
  id: uuidSchema,
  encryptedBlob: ciphertextEnvelopeSchema,
  kind: workspaceKindSchema,
});
export type CreateWorkspaceResponse = z.infer<
  typeof createWorkspaceResponseSchema
>;

export const workspaceListItemSchema = z.object({
  id: uuidSchema,
  encryptedBlob: ciphertextEnvelopeSchema,
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
  encryptedBlob: ciphertextEnvelopeSchema,
  kind: workspaceKindSchema,
  wrappedKey: sealedKeyEnvelopeSchema,
});
export type GetWorkspaceResponse = z.infer<typeof getWorkspaceResponseSchema>;

export const patchWorkspaceRequestSchema = z.object({
  encryptedBlob: ciphertextEnvelopeSchema,
});
export type PatchWorkspaceRequest = z.infer<typeof patchWorkspaceRequestSchema>;

export const patchWorkspaceResponseSchema = z.object({
  id: uuidSchema,
  encryptedBlob: ciphertextEnvelopeSchema,
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

export const putTaskRequestSchema = z.object({
  encryptedBlob: ciphertextEnvelopeSchema,
  sortOrder: z.number().int().optional(),
  deletedAt: z.string().nullable().optional(),
  /** Soft ref to a label option id in project ciphertext; null clears. */
  labelId: uuidSchema.nullable().optional(),
  /** Soft ref to a stage option id in project ciphertext. */
  stageId: uuidSchema.optional(),
  /** Soft ref to a priority option id in project ciphertext. */
  priorityId: uuidSchema.optional(),
  /** FK to milestones; null clears. */
  milestoneId: uuidSchema.nullable().optional(),
  /** Replace outgoing entity_links from this task when provided. */
  links: z.array(entityLinkTargetSchema).optional(),
  /** Replace TipTap fileAttachment links when provided. */
  attachmentIds: z.array(uuidSchema).optional(),
});
export type PutTaskRequest = z.infer<typeof putTaskRequestSchema>;

export const taskResponseSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  workspaceId: uuidSchema,
  encryptedBlob: ciphertextEnvelopeSchema,
  labelId: uuidSchema.nullable(),
  stageId: uuidSchema.nullable(),
  priorityId: uuidSchema.nullable(),
  milestoneId: uuidSchema.nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  links: z.array(entityLinkTargetSchema),
});
export type TaskResponse = z.infer<typeof taskResponseSchema>;

export const putMilestoneRequestSchema = z.object({
  encryptedBlob: ciphertextEnvelopeSchema,
  sortOrder: z.number().int().optional(),
  deletedAt: z.string().nullable().optional(),
});
export type PutMilestoneRequest = z.infer<typeof putMilestoneRequestSchema>;

export const milestoneResponseSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  workspaceId: uuidSchema,
  encryptedBlob: ciphertextEnvelopeSchema,
  sortOrder: z.number().int(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type MilestoneResponse = z.infer<typeof milestoneResponseSchema>;

export const listMilestonesResponseSchema = z.object({
  milestones: z.array(milestoneResponseSchema),
  nextCursor: z.string().nullable(),
});
export type ListMilestonesResponse = z.infer<
  typeof listMilestonesResponseSchema
>;

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

export const createdAtCursorSchema = z.object({
  createdAt: z.string(),
  id: uuidSchema,
});
export type CreatedAtCursor = z.infer<typeof createdAtCursorSchema>;

export const listProjectsResponseSchema = z.object({
  projects: z.array(projectResponseSchema),
  nextCursor: z.string().nullable(),
});
export type ListProjectsResponse = z.infer<typeof listProjectsResponseSchema>;

export const listTasksResponseSchema = z.object({
  tasks: z.array(taskResponseSchema),
  nextCursor: z.string().nullable(),
});
export type ListTasksResponse = z.infer<typeof listTasksResponseSchema>;

export const putNoteRequestSchema = z.object({
  encryptedBlob: ciphertextEnvelopeSchema,
  sortOrder: z.number().int().optional(),
  deletedAt: z.string().nullable().optional(),
  /** Replace non-project outgoing entity_links when provided. */
  links: z.array(entityLinkTargetSchema).optional(),
  /** Replace project affiliation edges when provided (0..n). */
  projectIds: z.array(uuidSchema).optional(),
  /** Replace TipTap fileAttachment links when provided. */
  attachmentIds: z.array(uuidSchema).optional(),
});
export type PutNoteRequest = z.infer<typeof putNoteRequestSchema>;

export const noteResponseSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  links: z.array(entityLinkTargetSchema),
  encryptedBlob: ciphertextEnvelopeSchema,
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type NoteResponse = z.infer<typeof noteResponseSchema>;

export const listNotesResponseSchema = z.object({
  notes: z.array(noteResponseSchema),
  nextCursor: z.string().nullable(),
});
export type ListNotesResponse = z.infer<typeof listNotesResponseSchema>;

export const entityLinkEdgeSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  sourceKind: entityLinkKindSchema,
  sourceId: uuidSchema,
  targetKind: entityLinkKindSchema,
  targetId: uuidSchema,
  createdAt: z.string(),
});
export type EntityLinkEdge = z.infer<typeof entityLinkEdgeSchema>;

export const listEntityLinksResponseSchema = z.object({
  links: z.array(entityLinkEdgeSchema),
});
export type ListEntityLinksResponse = z.infer<
  typeof listEntityLinksResponseSchema
>;

export const putContactRequestSchema = z.object({
  encryptedBlob: ciphertextEnvelopeSchema,
  sortOrder: z.number().int().optional(),
  deletedAt: z.string().nullable().optional(),
  /** Replace non-project outgoing entity_links when provided. */
  links: z.array(entityLinkTargetSchema).optional(),
  /** Replace project affiliation edges when provided (0..n). */
  projectIds: z.array(uuidSchema).optional(),
  /** Replace TipTap fileAttachment links when provided. */
  attachmentIds: z.array(uuidSchema).optional(),
});
export type PutContactRequest = z.infer<typeof putContactRequestSchema>;

export const contactResponseSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  encryptedBlob: ciphertextEnvelopeSchema,
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  links: z.array(entityLinkTargetSchema),
});
export type ContactResponse = z.infer<typeof contactResponseSchema>;

export const listContactsResponseSchema = z.object({
  contacts: z.array(contactResponseSchema),
  nextCursor: z.string().nullable(),
});
export type ListContactsResponse = z.infer<typeof listContactsResponseSchema>;

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

/** Invitee roles (cannot invite as owner). */
export const workspaceInviteRoleSchema = z.enum(["admin", "member"]);
export type WorkspaceInviteRole = z.infer<typeof workspaceInviteRoleSchema>;

export const invitationStatusSchema = z.enum([
  "waiting_for_recipient",
  "waiting_for_owner_seal",
  "ready_to_accept",
  "accepted",
  "cancelled",
]);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export const invitationEmailSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .email()
  .transform((value) => value.toLowerCase());

export const workspaceInvitationSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  workspaceEncryptedBlob: ciphertextEnvelopeSchema.optional(),
  email: z.string().min(1),
  role: workspaceInviteRoleSchema,
  status: invitationStatusSchema,
  invitedBy: uuidSchema,
  claimedBy: uuidSchema.nullable(),
  claimedPublicKey: base64UrlSchema.nullable(),
  claimedAt: z.string().nullable(),
  sealedAt: z.string().nullable(),
  sealedWorkspaceKey: sealedKeyEnvelopeSchema.nullable().optional(),
  acceptedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkspaceInvitation = z.infer<typeof workspaceInvitationSchema>;

export const createWorkspaceInvitationRequestSchema = z.object({
  id: uuidSchema,
  email: invitationEmailSchema,
  role: workspaceInviteRoleSchema.default("member"),
});
export type CreateWorkspaceInvitationRequest = z.infer<
  typeof createWorkspaceInvitationRequestSchema
>;

export const listWorkspaceInvitationsResponseSchema = z.object({
  invitations: z.array(workspaceInvitationSchema),
});
export type ListWorkspaceInvitationsResponse = z.infer<
  typeof listWorkspaceInvitationsResponseSchema
>;

export const sealWorkspaceInvitationRequestSchema = z.object({
  sealedKey: sealedKeyEnvelopeSchema,
});
export type SealWorkspaceInvitationRequest = z.infer<
  typeof sealWorkspaceInvitationRequestSchema
>;

export const listMyInvitationsResponseSchema = z.object({
  invitations: z.array(workspaceInvitationSchema),
});
export type ListMyInvitationsResponse = z.infer<
  typeof listMyInvitationsResponseSchema
>;

export const workspaceMemberSchema = z.object({
  userId: uuidSchema,
  role: workspaceRoleSchema,
  createdAt: z.string(),
});
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;

export const listWorkspaceMembersResponseSchema = z.object({
  members: z.array(workspaceMemberSchema),
});
export type ListWorkspaceMembersResponse = z.infer<
  typeof listWorkspaceMembersResponseSchema
>;

/** P6f / P12 billing: plaintext entitlements only; never encryption keys or content. */
export const planIdSchema = z.enum(["free", "pro"]);
export type PlanId = z.infer<typeof planIdSchema>;

export const billingSourceSchema = z.enum(["stripe", "comp"]);
export type BillingSource = z.infer<typeof billingSourceSchema>;

export const addonMeterSchema = z.enum(["capacity"]);
export type AddonMeterId = z.infer<typeof addonMeterSchema>;

export const subscriptionStatusSchema = z.enum([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

/** null = unlimited (complimentary / unmetered). */
export const workspaceLimitsSchema = z.object({
  projects: z.number().int().positive().nullable(),
  members: z.number().int().positive().nullable(),
  tasks: z.number().int().positive().nullable(),
  notes: z.number().int().positive().nullable(),
  contacts: z.number().int().positive().nullable(),
  filesPerTask: z.number().int().nonnegative().nullable(),
  /** Ciphertext bytes; free plan is 0 (no uploads). */
  storageBytes: z.number().int().nonnegative().nullable(),
  /** Max ciphertext bytes per file; free plan is 0. */
  maxUploadBytes: z.number().int().nonnegative(),
});
export type WorkspaceLimits = z.infer<typeof workspaceLimitsSchema>;

export const workspaceUsageSchema = z.object({
  projects: z.number().int().nonnegative(),
  members: z.number().int().nonnegative(),
  pendingInvitations: z.number().int().nonnegative(),
  tasks: z.number().int().nonnegative(),
  notes: z.number().int().nonnegative(),
  contacts: z.number().int().nonnegative(),
  /** Sum of ready (+ reserved pending) attachment ciphertext bytes. */
  storageBytes: z.number().int().nonnegative(),
});
export type WorkspaceUsage = z.infer<typeof workspaceUsageSchema>;

export const billingAddonSchema = z.object({
  meter: addonMeterSchema,
  quantity: z.number().int().nonnegative(),
  packSize: z.number().int().positive(),
  label: z.string().min(1),
});
export type BillingAddon = z.infer<typeof billingAddonSchema>;

export const getWorkspaceBillingResponseSchema = z.object({
  workspaceId: uuidSchema,
  plan: planIdSchema,
  status: subscriptionStatusSchema,
  billingSource: billingSourceSchema,
  unmetered: z.boolean(),
  discountPercentOff: z.number().int().min(1).max(100).nullable(),
  cancelAtPeriodEnd: z.boolean(),
  currentPeriodEnd: z.string().nullable(),
  hasStripeCustomer: z.boolean(),
  /** Soft-lock: owner exceeds free workspace allowance after Pro/comp ended. */
  freeOverflowLocked: z.boolean(),
  limits: workspaceLimitsSchema,
  usage: workspaceUsageSchema,
  addons: z.array(billingAddonSchema),
});
export type GetWorkspaceBillingResponse = z.infer<
  typeof getWorkspaceBillingResponseSchema
>;

export const billingRedirectResponseSchema = z.object({
  url: z.string().url(),
});
export type BillingRedirectResponse = z.infer<
  typeof billingRedirectResponseSchema
>;

export const redeemDiscountRequestSchema = z.object({
  code: z.string().min(8).max(64),
});
export type RedeemDiscountRequest = z.infer<typeof redeemDiscountRequestSchema>;

export const redeemDiscountResponseSchema = z.object({
  kind: z.enum(["comp", "percent_off"]),
  percentOff: z.number().int().min(1).max(100),
  /** Present when kind=percent_off and Checkout should follow. */
  checkoutUrl: z.string().url().optional(),
});
export type RedeemDiscountResponse = z.infer<
  typeof redeemDiscountResponseSchema
>;

export const removeDiscountResponseSchema = z.object({
  ok: z.literal(true),
});
export type RemoveDiscountResponse = z.infer<
  typeof removeDiscountResponseSchema
>;

export const updateBillingAddonsRequestSchema = z.object({
  quantities: z.record(addonMeterSchema, z.number().int().nonnegative()),
});
export type UpdateBillingAddonsRequest = z.infer<
  typeof updateBillingAddonsRequestSchema
>;

export const updateBillingAddonsResponseSchema = z.object({
  addons: z.array(billingAddonSchema),
});
export type UpdateBillingAddonsResponse = z.infer<
  typeof updateBillingAddonsResponseSchema
>;

/** P11 attachments: ciphertext-opaque metadata + signed URL handoff. */
export const attachmentStatusSchema = z.enum(["pending", "ready", "failed"]);
export type AttachmentStatus = z.infer<typeof attachmentStatusSchema>;

export const attachmentParentKindSchema = z.enum(["note", "task", "contact"]);
export type AttachmentParentKind = z.infer<typeof attachmentParentKindSchema>;

export const createAttachmentRequestSchema = z.object({
  id: uuidSchema,
  byteSize: z.number().int().nonnegative(),
  encryptedMeta: ciphertextEnvelopeSchema,
  wrappedDek: wrappedKeyEnvelopeSchema,
});
export type CreateAttachmentRequest = z.infer<
  typeof createAttachmentRequestSchema
>;

export const createAttachmentResponseSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  byteSize: z.number().int().nonnegative(),
  storagePath: z.string().min(1),
  status: attachmentStatusSchema,
  uploadUrl: z.string().url(),
  encryptedMeta: ciphertextEnvelopeSchema,
  wrappedDek: wrappedKeyEnvelopeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CreateAttachmentResponse = z.infer<
  typeof createAttachmentResponseSchema
>;

export const attachmentResponseSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  byteSize: z.number().int().nonnegative(),
  storagePath: z.string().min(1),
  status: attachmentStatusSchema,
  encryptedMeta: ciphertextEnvelopeSchema,
  wrappedDek: wrappedKeyEnvelopeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type AttachmentResponse = z.infer<typeof attachmentResponseSchema>;

export const completeAttachmentResponseSchema = attachmentResponseSchema;
export type CompleteAttachmentResponse = z.infer<
  typeof completeAttachmentResponseSchema
>;

export const downloadAttachmentResponseSchema = z.object({
  id: uuidSchema,
  downloadUrl: z.string().url(),
  byteSize: z.number().int().nonnegative(),
  encryptedMeta: ciphertextEnvelopeSchema,
  wrappedDek: wrappedKeyEnvelopeSchema,
});
export type DownloadAttachmentResponse = z.infer<
  typeof downloadAttachmentResponseSchema
>;

export const listAttachmentsResponseSchema = z.object({
  attachments: z.array(attachmentResponseSchema),
});
export type ListAttachmentsResponse = z.infer<
  typeof listAttachmentsResponseSchema
>;

export const getMeAccountResponseSchema = z.object({
  email: z.string().email(),
  userId: uuidSchema,
  /** Owned workspaces that still have other members. These block deletion. */
  blockingWorkspaces: z.array(
    z.object({
      id: uuidSchema,
    }),
  ),
  /** Owned workspaces with no other members. Deleted with the account. */
  soloOwnedWorkspaces: z.array(
    z.object({
      id: uuidSchema,
      kind: workspaceKindSchema,
    }),
  ),
  /** Workspaces the account is only removed from. Names resolve client-side after unlock. */
  leavingWorkspaces: z.array(
    z.object({
      id: uuidSchema,
      role: workspaceRoleSchema,
    }),
  ),
});
export type GetMeAccountResponse = z.infer<typeof getMeAccountResponseSchema>;
