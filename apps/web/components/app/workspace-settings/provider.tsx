"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  GetWorkspaceBillingResponse,
  WorkspaceInvitation,
  WorkspaceInviteRole,
  WorkspaceMember,
} from "@helvety-cloud/api-contract";

import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  ApiClientError,
  cancelWorkspaceInvitation,
  createBillingCheckout,
  createBillingPortal,
  createWorkspaceInvitation,
  getWorkspaceBilling,
  listWorkspaceInvitations,
  listWorkspaceMembers,
  redeemBillingDiscount,
  removeBillingDiscount,
} from "@/lib/api/v1-client";
import {
  handoffInvitationSeal,
  invitationMailto,
} from "@/lib/vault/workspaces";

const BLOCKING_SUB_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

type WorkspaceSettingsContextValue = {
  workspace: {
    id: string;
    name: string;
    kind: string;
    role: string;
  } | null;
  canManage: boolean;
  isOwner: boolean;
  isPersonal: boolean;
  setNameDraft: (value: string | null) => void;
  name: string;
  email: string;
  setEmail: (value: string) => void;
  role: WorkspaceInviteRole;
  setRole: (value: WorkspaceInviteRole) => void;
  members: WorkspaceMember[];
  billing: GetWorkspaceBillingResponse | null;
  pending: boolean;
  membersLoading: boolean;
  billingLoading: boolean;
  error: string | null;
  seatLimitHit: boolean;
  copiedId: string | null;
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  deleteConfirmName: string;
  setDeleteConfirmName: (value: string) => void;
  activeInvites: WorkspaceInvitation[];
  needsBillingCancel: boolean;
  ensureMembersLoaded: () => Promise<void>;
  ensureBillingLoaded: () => Promise<void>;
  onSaveName: () => Promise<void>;
  onUpgrade: () => Promise<void>;
  onManageBilling: () => Promise<void>;
  onRedeemDiscount: (code: string) => Promise<void>;
  onRemoveDiscount: () => Promise<void>;
  onInvite: () => Promise<void>;
  onSeal: (invitation: WorkspaceInvitation) => Promise<void>;
  onCancel: (invitation: WorkspaceInvitation) => Promise<void>;
  onCopyInvite: (invitation: WorkspaceInvitation) => Promise<void>;
  onDeleteWorkspace: () => Promise<void>;
};

const WorkspaceSettingsContext =
  createContext<WorkspaceSettingsContextValue | null>(null);

export function WorkspaceSettingsProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    vault,
    workspaces,
    getWorkspaceKey,
    renameWorkspace,
    removeWorkspace,
  } = useVaultSession();

  const workspace = workspaces.find((w) => w.id === workspaceId) ?? null;
  const canManage =
    workspace?.role === "owner" || workspace?.role === "admin";
  const isOwner = workspace?.role === "owner";
  const isPersonal = workspace?.kind === "personal";

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const name = nameDraft ?? workspace?.name ?? "";
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceInviteRole>("member");
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [billing, setBilling] = useState<GetWorkspaceBillingResponse | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seatLimitHit, setSeatLimitHit] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const ensureMembersLoaded = useCallback(async () => {
    if (membersLoaded) return;
    setMembersLoading(true);
    setError(null);
    try {
      const [inv, mem] = await Promise.all([
        canManage
          ? listWorkspaceInvitations(workspaceId)
          : Promise.resolve({ invitations: [] }),
        listWorkspaceMembers(workspaceId),
      ]);
      setInvitations(inv.invitations);
      setMembers(mem.members);
      setMembersLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setMembersLoading(false);
    }
  }, [membersLoaded, canManage, workspaceId]);

  const refreshBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const bill = await getWorkspaceBilling(workspaceId).catch(() => null);
      setBilling(bill);
      setBillingLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setBillingLoading(false);
    }
  }, [workspaceId]);

  const ensureBillingLoaded = useCallback(async () => {
    if (billingLoaded) return;
    setError(null);
    await refreshBilling();
  }, [billingLoaded, refreshBilling]);

  const refreshMembers = useCallback(async () => {
    const [inv, mem] = await Promise.all([
      canManage
        ? listWorkspaceInvitations(workspaceId)
        : Promise.resolve({ invitations: [] }),
      listWorkspaceMembers(workspaceId),
    ]);
    setInvitations(inv.invitations);
    setMembers(mem.members);
    setMembersLoaded(true);
  }, [canManage, workspaceId]);

  async function onSaveName() {
    const trimmed = name.trim();
    if (!trimmed || !workspace || trimmed === workspace.name) return;
    setPending(true);
    setError(null);
    try {
      await renameWorkspace(workspaceId, trimmed);
      setNameDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setPending(false);
    }
  }

  async function onUpgrade() {
    setPending(true);
    setError(null);
    try {
      const { url } = await createBillingCheckout(workspaceId);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
      setPending(false);
    }
  }

  async function onManageBilling() {
    setPending(true);
    setError(null);
    try {
      const { url } = await createBillingPortal(workspaceId);
      window.location.assign(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open billing portal",
      );
      setPending(false);
    }
  }

  async function onRedeemDiscount(code: string) {
    setPending(true);
    setError(null);
    try {
      const result = await redeemBillingDiscount(workspaceId, code);
      if (result.kind === "percent_off" && result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      await refreshBilling();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "conflict") {
        await refreshBilling();
        return;
      }
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not redeem code",
      );
    } finally {
      setPending(false);
    }
  }

  async function onRemoveDiscount() {
    setPending(true);
    setError(null);
    try {
      await removeBillingDiscount(workspaceId);
      await refreshBilling();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not remove discount",
      );
    } finally {
      setPending(false);
    }
  }

  async function onInvite() {
    if (!canManage || !workspace) return;
    const trimmed = email.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    setSeatLimitHit(false);
    try {
      const created = await createWorkspaceInvitation(workspaceId, {
        id: crypto.randomUUID(),
        email: trimmed,
        role,
      });
      setEmail("");
      setInvitations((prev) => [created, ...prev]);
      const mail = invitationMailto({
        email: created.email,
        workspaceName: workspace.name,
        appOrigin: window.location.origin,
      });
      window.open(mail.href, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "limit_exceeded") {
        setSeatLimitHit(true);
        await ensureBillingLoaded();
      }
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Invite failed",
      );
    } finally {
      setPending(false);
    }
  }

  async function onSeal(invitation: WorkspaceInvitation) {
    if (!vault || !invitation.claimedPublicKey) return;
    setPending(true);
    setError(null);
    try {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      await handoffInvitationSeal({
        vault,
        workspaceId,
        invitationId: invitation.id,
        claimedPublicKey: invitation.claimedPublicKey,
        workspaceKey,
      });
      await refreshMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Key handoff failed");
    } finally {
      setPending(false);
    }
  }

  async function onCancel(invitation: WorkspaceInvitation) {
    setPending(true);
    setError(null);
    try {
      await cancelWorkspaceInvitation(workspaceId, invitation.id);
      await refreshMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setPending(false);
    }
  }

  async function onCopyInvite(invitation: WorkspaceInvitation) {
    if (!workspace) return;
    const mail = invitationMailto({
      email: invitation.email,
      workspaceName: workspace.name,
      appOrigin: window.location.origin,
    });
    try {
      await navigator.clipboard.writeText(mail.body);
      setCopiedId(invitation.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Could not copy invitation text");
    }
  }

  async function onDeleteWorkspace() {
    setPending(true);
    setError(null);
    try {
      await removeWorkspace(workspaceId);
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setPending(false);
      throw err;
    }
  }

  const activeInvites = invitations.filter(
    (i) => i.status !== "cancelled" && i.status !== "accepted",
  );

  const needsBillingCancel =
    isOwner &&
    !isPersonal &&
    Boolean(
      billing &&
        billing.billingSource === "stripe" &&
        billing.hasStripeCustomer &&
        BLOCKING_SUB_STATUSES.has(billing.status) &&
        !billing.cancelAtPeriodEnd,
    );

  if (!vault) return null;

  const value: WorkspaceSettingsContextValue = {
    workspace,
    canManage,
    isOwner,
    isPersonal,
    setNameDraft,
    name,
    email,
    setEmail,
    role,
    setRole,
    members,
    billing,
    pending,
    membersLoading,
    billingLoading,
    error,
    seatLimitHit,
    copiedId,
    deleteOpen,
    setDeleteOpen,
    deleteConfirmName,
    setDeleteConfirmName,
    activeInvites,
    needsBillingCancel,
    ensureMembersLoaded,
    ensureBillingLoaded,
    onSaveName,
    onUpgrade,
    onManageBilling,
    onRedeemDiscount,
    onRemoveDiscount,
    onInvite,
    onSeal,
    onCancel,
    onCopyInvite,
    onDeleteWorkspace,
  };

  return (
    <WorkspaceSettingsContext.Provider value={value}>
      {children}
    </WorkspaceSettingsContext.Provider>
  );
}

export function useWorkspaceSettings(): WorkspaceSettingsContextValue {
  const ctx = useContext(WorkspaceSettingsContext);
  if (!ctx) {
    throw new Error(
      "useWorkspaceSettings must be used within WorkspaceSettingsProvider",
    );
  }
  return ctx;
}

export function invitationStatusLabel(
  status: WorkspaceInvitation["status"],
): string {
  switch (status) {
    case "waiting_for_recipient":
      return "Waiting for recipient";
    case "waiting_for_owner_seal":
      return "Needs key handoff";
    case "ready_to_accept":
      return "Ready to accept";
    case "accepted":
      return "Accepted";
    case "cancelled":
      return "Cancelled";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
