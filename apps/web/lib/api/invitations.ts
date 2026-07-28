import {
  invitationStatusSchema,
  sealedKeyEnvelopeSchema,
  workspaceInvitationSchema,
  workspaceInviteRoleSchema,
  type CiphertextEnvelope,
  type InvitationStatus,
  type WorkspaceInvitation,
} from "@helvety-cloud/api-contract";

type InvitationRow = {
  id: string;
  workspace_id: string;
  email: string;
  invited_by: string;
  role: string;
  claimed_by: string | null;
  claimed_public_key: string | null;
  claimed_at: string | null;
  sealed_workspace_key: unknown | null;
  sealed_at: string | null;
  sealed_by: string | null;
  accepted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

function invitationStatus(row: InvitationRow): InvitationStatus {
  if (row.cancelled_at) return "cancelled";
  if (row.accepted_at) return "accepted";
  if (!row.claimed_by) return "waiting_for_recipient";
  if (!row.sealed_workspace_key) return "waiting_for_seal";
  return "ready_to_accept";
}

export function mapInvitationRow(
  row: InvitationRow,
  workspaceEncryptedBlob?: CiphertextEnvelope,
): WorkspaceInvitation {
  return workspaceInvitationSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    workspaceEncryptedBlob,
    email: row.email,
    role: workspaceInviteRoleSchema.parse(row.role),
    status: invitationStatusSchema.parse(invitationStatus(row)),
    invitedBy: row.invited_by,
    claimedBy: row.claimed_by,
    claimedPublicKey: row.claimed_public_key,
    claimedAt: row.claimed_at,
    sealedAt: row.sealed_at,
    sealedWorkspaceKey:
      row.sealed_workspace_key == null
        ? row.sealed_workspace_key
        : sealedKeyEnvelopeSchema.parse(row.sealed_workspace_key),
    acceptedAt: row.accepted_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
