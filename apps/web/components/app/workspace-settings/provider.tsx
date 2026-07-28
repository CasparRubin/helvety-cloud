"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  GetWorkspaceBillingResponse,
  WorkspaceInvitation,
  WorkspaceMember,
} from "@helvety-cloud/api-contract";

import {
  addCategorizationOption,
  deleteCategorizationOption,
  renameCategorizationOption,
  reorderCategorizationOption,
  setCategorizationDefault,
  setCategorizationOptionColor,
  setCategorizationOptionIcon,
  setCategorizationOptionMaxVisibleTasks,
  setCategorizationOptionCompletionPercent,
} from "@/lib/client-crypto/categorization-ops";
import type {
  CategorizationIcon,
  CategorizationKind,
  WorkspaceCategorizations,
} from "@/lib/client-crypto/categorizations";
import type { EntityColor } from "@/lib/client-crypto/entity-colors";
import { remapWorkspaceTasksForCategorizationChange } from "@/lib/client-crypto/tasks";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import {
  ApiClientError,
  cancelWorkspaceInvitation,
  createBillingCheckout,
  createBillingPortal,
  createWorkspaceInvitation,
  getWorkspaceBilling,
  listWorkspaceInvitations,
  listWorkspaceMembers,
  removeWorkspaceMember,
  syncWorkspaceBilling,
} from "@/lib/api/v1-client";
import {
  handoffInvitationSeal,
  invitationMailto,
} from "@/lib/client-crypto/workspaces";

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
    categorizations: WorkspaceCategorizations;
    kind: string;
    role: string;
  } | null;
  isPersonal: boolean;
  setNameDraft: (value: string | null) => void;
  name: string;
  members: WorkspaceMember[];
  billing: GetWorkspaceBillingResponse | null;
  pending: boolean;
  membersLoading: boolean;
  billingLoading: boolean;
  error: string | null;
  memberLimitHit: boolean;
  copiedId: string | null;
  categorizationsError: string | null;
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  deleteConfirmName: string;
  setDeleteConfirmName: (value: string) => void;
  leaveOpen: boolean;
  setLeaveOpen: (open: boolean) => void;
  activeInvites: WorkspaceInvitation[];
  needsBillingCancel: boolean;
  hasActiveProBilling: boolean;
  onAddOption: (kind: CategorizationKind, name: string) => Promise<void>;
  onRenameOption: (
    kind: CategorizationKind,
    id: string,
    name: string,
  ) => Promise<void>;
  onDeleteOption: (kind: CategorizationKind, id: string) => Promise<void>;
  onReorderOption: (
    kind: CategorizationKind,
    id: string,
    direction: "up" | "down",
  ) => Promise<void>;
  onSetDefault: (
    kind: "stages" | "priorities",
    id: string,
  ) => Promise<void>;
  onSetOptionColor: (
    kind: CategorizationKind,
    id: string,
    color: EntityColor | undefined,
  ) => Promise<void>;
  onSetOptionIcon: (
    kind: CategorizationKind,
    id: string,
    icon: CategorizationIcon | undefined,
  ) => Promise<void>;
  onSetMaxVisibleTasks: (id: string, maxVisibleTasks: number) => Promise<void>;
  onSetCompletionPercent: (
    id: string,
    completionPercent: number,
  ) => Promise<void>;
  ensureMembersLoaded: () => Promise<void>;
  ensureBillingLoaded: () => Promise<void>;
  onSaveName: () => Promise<void>;
  onUpgrade: () => Promise<void>;
  onManageBilling: () => Promise<void>;
  onInvite: (opts: { email: string }) => Promise<void>;
  onSeal: (invitation: WorkspaceInvitation) => Promise<void>;
  onCancel: (invitation: WorkspaceInvitation) => Promise<void>;
  onCopyInvite: (invitation: WorkspaceInvitation) => Promise<void>;
  onDeleteWorkspace: () => Promise<void>;
  onLeaveWorkspace: () => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
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
  const billingSyncAttempted = useRef(false);
  const { userKeys, workspaces, getWorkspaceKey, renameWorkspace, removeWorkspace, leaveWorkspace, refreshWorkspaces } =
    useCryptoSession();

  const workspace = workspaces.find((w) => w.id === workspaceId) ?? null;
  const isPersonal = workspace?.kind === "personal";

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const name = nameDraft ?? workspace?.name ?? "";
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
  const [memberLimitHit, setMemberLimitHit] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [categorizationsError, setCategorizationsError] = useState<string | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);

  const ensureMembersLoaded = useCallback(async () => {
    if (membersLoaded) return;
    setMembersLoading(true);
    setError(null);
    try {
      const [inv, mem] = await Promise.all([
        listWorkspaceInvitations(workspaceId),
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
  }, [membersLoaded, workspaceId]);

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

  useEffect(() => {
    if (!workspace || billingSyncAttempted.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") !== "success") return;
    billingSyncAttempted.current = true;

    let cancelled = false;
    void (async () => {
      setBillingLoading(true);
      setError(null);
      try {
        const bill = await syncWorkspaceBilling(workspaceId);
        if (!cancelled) {
          setBilling(bill);
          setBillingLoaded(true);
          void refreshWorkspaces().catch(() => {});
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not refresh billing after checkout",
          );
          await refreshBilling();
        }
      } finally {
        if (!cancelled) setBillingLoading(false);
        router.replace(`/app/w/${workspaceId}/settings/billing`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspace, refreshBilling, refreshWorkspaces, router, workspaceId]);

  const refreshMembers = useCallback(async () => {
    const [inv, mem] = await Promise.all([
      listWorkspaceInvitations(workspaceId),
      listWorkspaceMembers(workspaceId),
    ]);
    setInvitations(inv.invitations);
    setMembers(mem.members);
    setMembersLoaded(true);
  }, [workspaceId]);

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

  async function onInvite(opts: { email: string }) {
    if (!workspace) return;
    const trimmed = opts.email.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    setMemberLimitHit(false);
    try {
      const created = await createWorkspaceInvitation(workspaceId, {
        id: crypto.randomUUID(),
        email: trimmed,
        role: "member",
      });
      setInvitations((prev) => [created, ...prev]);
      const mail = invitationMailto({
        email: created.email,
        workspaceName: workspace.name,
        appOrigin: window.location.origin,
      });
      window.open(mail.href, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "limit_exceeded") {
        setMemberLimitHit(true);
        await ensureBillingLoaded();
      }
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Invite failed";
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setPending(false);
    }
  }

  async function onSeal(invitation: WorkspaceInvitation) {
    if (!userKeys || !invitation.claimedPublicKey) return;
    setPending(true);
    setError(null);
    try {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      await handoffInvitationSeal({
        userKeys,
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

  async function onLeaveWorkspace() {
    setPending(true);
    setError(null);
    try {
      await leaveWorkspace(workspaceId);
      setLeaveOpen(false);
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Leave failed");
      setPending(false);
      throw err;
    }
  }

  async function onRemoveMember(userId: string) {
    setPending(true);
    setError(null);
    try {
      await removeWorkspaceMember(workspaceId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
      throw err;
    } finally {
      setPending(false);
    }
  }

  const activeInvites = invitations.filter(
    (i) => i.status !== "cancelled" && i.status !== "accepted",
  );

  const hasActiveProBilling = Boolean(
    billing &&
      billing.plan === "pro" &&
      BLOCKING_SUB_STATUSES.has(billing.status),
  );

  const needsBillingCancel =
    !isPersonal &&
    Boolean(
      billing &&
        billing.hasStripeCustomer &&
        BLOCKING_SUB_STATUSES.has(billing.status) &&
        !billing.cancelAtPeriodEnd,
    );

  if (!userKeys) return null;
  const activeWorkspace = workspace ?? null;
  const activeUserKeys = userKeys;

  async function withCategorizationSave(fn: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError(null);
    setCategorizationsError(null);
    try {
      await fn();
      await refreshWorkspaces();
      window.dispatchEvent(new Event("helvety:workspace-categorizations-changed"));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save categorizations";
      setError(message);
      setCategorizationsError(message);
    } finally {
      setPending(false);
    }
  }

  async function onAddOption(kind: CategorizationKind, name: string) {
    await withCategorizationSave(async () => {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      await addCategorizationOption(
        workspaceId,
        workspaceKey,
        activeWorkspace!,
        activeUserKeys.keyVersion,
        kind,
        name,
      );
    });
  }

  async function onRenameOption(
    kind: CategorizationKind,
    id: string,
    name: string,
  ) {
    await withCategorizationSave(async () => {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      await renameCategorizationOption(
        workspaceId,
        workspaceKey,
        activeWorkspace!,
        activeUserKeys.keyVersion,
        kind,
        id,
        name,
      );
    });
  }

  async function onDeleteOption(kind: CategorizationKind, id: string) {
    await withCategorizationSave(async () => {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      const remap = await deleteCategorizationOption(
        workspaceId,
        workspaceKey,
        activeWorkspace!,
        activeUserKeys.keyVersion,
        kind,
        id,
      );
      await remapWorkspaceTasksForCategorizationChange(
        workspaceId,
        workspaceKey,
        (task) => {
          if (kind === "labels" && task.labelId === id) {
            return {
              labelId: remap.remappedLabelId ?? null,
              stageId: task.stageId,
              priorityId: task.priorityId,
            };
          }
          if (kind === "stages" && task.stageId === id) {
            return {
              labelId: task.labelId,
              stageId: remap.remappedStageId ?? task.stageId,
              priorityId: task.priorityId,
            };
          }
          if (kind === "priorities" && task.priorityId === id) {
            return {
              labelId: task.labelId,
              stageId: task.stageId,
              priorityId: remap.remappedPriorityId ?? task.priorityId,
            };
          }
          return null;
        },
      );
    });
  }

  async function onReorderOption(
    kind: CategorizationKind,
    id: string,
    direction: "up" | "down",
  ) {
    await withCategorizationSave(async () => {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      await reorderCategorizationOption(
        workspaceId,
        workspaceKey,
        activeWorkspace!,
        activeUserKeys.keyVersion,
        kind,
        id,
        direction,
      );
    });
  }

  async function onSetDefault(kind: "stages" | "priorities", id: string) {
    await withCategorizationSave(async () => {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      await setCategorizationDefault(
        workspaceId,
        workspaceKey,
        activeWorkspace!,
        activeUserKeys.keyVersion,
        kind,
        id,
      );
    });
  }

  async function onSetOptionColor(
    kind: CategorizationKind,
    id: string,
    color: EntityColor | undefined,
  ) {
    await withCategorizationSave(async () => {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      await setCategorizationOptionColor(
        workspaceId,
        workspaceKey,
        activeWorkspace!,
        activeUserKeys.keyVersion,
        kind,
        id,
        color ?? null,
      );
    });
  }

  async function onSetOptionIcon(
    kind: CategorizationKind,
    id: string,
    icon: CategorizationIcon | undefined,
  ) {
    await withCategorizationSave(async () => {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      await setCategorizationOptionIcon(
        workspaceId,
        workspaceKey,
        activeWorkspace!,
        activeUserKeys.keyVersion,
        kind,
        id,
        icon ?? null,
      );
    });
  }

  async function onSetMaxVisibleTasks(id: string, maxVisibleTasks: number) {
    await withCategorizationSave(async () => {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      await setCategorizationOptionMaxVisibleTasks(
        workspaceId,
        workspaceKey,
        activeWorkspace!,
        activeUserKeys.keyVersion,
        id,
        maxVisibleTasks,
      );
    });
  }

  async function onSetCompletionPercent(id: string, completionPercent: number) {
    await withCategorizationSave(async () => {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      await setCategorizationOptionCompletionPercent(
        workspaceId,
        workspaceKey,
        activeWorkspace!,
        activeUserKeys.keyVersion,
        id,
        completionPercent,
      );
    });
  }

  const value: WorkspaceSettingsContextValue = {
    workspace: activeWorkspace,
    isPersonal,
    setNameDraft,
    name,
    members,
    billing,
    pending,
    membersLoading,
    billingLoading,
    error,
    memberLimitHit,
    copiedId,
    categorizationsError,
    deleteOpen,
    setDeleteOpen,
    deleteConfirmName,
    setDeleteConfirmName,
    leaveOpen,
    setLeaveOpen,
    activeInvites,
    needsBillingCancel,
    hasActiveProBilling,
    onAddOption,
    onRenameOption,
    onDeleteOption,
    onReorderOption,
    onSetDefault,
    onSetOptionColor,
    onSetOptionIcon,
    onSetMaxVisibleTasks,
    onSetCompletionPercent,
    ensureMembersLoaded,
    ensureBillingLoaded,
    onSaveName,
    onUpgrade,
    onManageBilling,
    onInvite,
    onSeal,
    onCancel,
    onCopyInvite,
    onDeleteWorkspace,
    onLeaveWorkspace,
    onRemoveMember,
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
