"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { WorkspaceListItem } from "@helvety-cloud/api-contract";

import {
  deleteWorkspace,
  listWorkspaces,
  patchWorkspace,
  getMeCrypto,
} from "@/lib/api/v1-client";
import { createPrfUnlock, assertPrfUnlock } from "@/lib/vault/prf";
import {
  createRecoveryExport,
  type RecoveryExport,
} from "@/lib/vault/recovery";
import {
  hasUserCrypto,
  setupUserKeys,
  unlockUserKeys,
  type UnlockedVault,
} from "@/lib/vault/user-keys";
import {
  createStandardWorkspace,
  ensurePersonalWorkspace,
  unwrapWorkspaceKey,
} from "@/lib/vault/workspaces";

type VaultSessionValue = {
  vault: UnlockedVault | null;
  recovery: RecoveryExport | null;
  workspaces: WorkspaceListItem[];
  workspaceKeys: ReadonlyMap<string, Uint8Array>;
  clearRecovery: () => void;
  lock: () => void;
  setupVault: (userId: string, email: string) => Promise<void>;
  unlockVault: (userId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<WorkspaceListItem[]>;
  createWorkspace: (name: string) => Promise<WorkspaceListItem>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  removeWorkspace: (workspaceId: string) => Promise<void>;
  getWorkspaceKey: (workspaceId: string) => Promise<Uint8Array>;
};

const VaultSessionContext = createContext<VaultSessionValue | null>(null);

export function VaultSessionProvider({ children }: { children: ReactNode }) {
  const [vault, setVault] = useState<UnlockedVault | null>(null);
  const [recovery, setRecovery] = useState<RecoveryExport | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [workspaceKeys, setWorkspaceKeys] = useState<Map<string, Uint8Array>>(
    () => new Map(),
  );

  const lock = useCallback(() => {
    setVault(null);
    setRecovery(null);
    setWorkspaces([]);
    setWorkspaceKeys(new Map());
  }, []);

  const clearRecovery = useCallback(() => {
    setRecovery(null);
  }, []);

  const cacheWorkspaceKey = useCallback(
    (workspaceId: string, key: Uint8Array) => {
      setWorkspaceKeys((prev) => {
        const next = new Map(prev);
        next.set(workspaceId, key);
        return next;
      });
    },
    [],
  );

  const refreshWorkspaces = useCallback(async () => {
    const listed = await listWorkspaces();
    setWorkspaces(listed.workspaces);
    return listed.workspaces;
  }, []);

  const afterUnlocked = useCallback(
    async (unlocked: UnlockedVault) => {
      await ensurePersonalWorkspace(unlocked);
      const listed = await listWorkspaces();
      setWorkspaces(listed.workspaces);
      setVault(unlocked);
    },
    [],
  );

  const setupVault = useCallback(
    async (userId: string, email: string) => {
      const prf = await createPrfUnlock(userId, email);
      const unlocked = await setupUserKeys(userId, prf.unlockKey, prf.prfSalt);
      const recoveryExport = await createRecoveryExport(
        userId,
        unlocked.userSymmetricKey,
        unlocked.keyVersion,
      );
      setRecovery(recoveryExport);
      await afterUnlocked(unlocked);
    },
    [afterUnlocked],
  );

  const unlockVault = useCallback(
    async (userId: string) => {
      const row = await getMeCrypto();
      const prf = await assertPrfUnlock(userId, row.prfSalt);
      const unlocked = await unlockUserKeys(userId, prf.unlockKey, row);
      await afterUnlocked(unlocked);
    },
    [afterUnlocked],
  );

  const createWorkspace = useCallback(
    async (name: string) => {
      if (!vault) {
        throw new Error("Vault is locked");
      }
      const created = await createStandardWorkspace(vault, name);
      const key = await unwrapWorkspaceKey(
        vault,
        created.id,
        created.wrappedKey,
      );
      cacheWorkspaceKey(created.id, key);
      const listed = await refreshWorkspaces();
      return listed.find((w) => w.id === created.id) ?? created;
    },
    [vault, cacheWorkspaceKey, refreshWorkspaces],
  );

  const renameWorkspace = useCallback(
    async (workspaceId: string, name: string) => {
      await patchWorkspace(workspaceId, { name });
      await refreshWorkspaces();
    },
    [refreshWorkspaces],
  );

  const removeWorkspace = useCallback(async (workspaceId: string) => {
    await deleteWorkspace(workspaceId);
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
    setWorkspaceKeys((prev) => {
      const next = new Map(prev);
      next.delete(workspaceId);
      return next;
    });
  }, []);

  const getWorkspaceKey = useCallback(
    async (workspaceId: string) => {
      if (!vault) {
        throw new Error("Vault is locked");
      }
      const cached = workspaceKeys.get(workspaceId);
      if (cached) return cached;
      const item = workspaces.find((w) => w.id === workspaceId);
      if (!item) {
        throw new Error("Workspace not found");
      }
      const key = await unwrapWorkspaceKey(vault, workspaceId, item.wrappedKey);
      cacheWorkspaceKey(workspaceId, key);
      return key;
    },
    [vault, workspaceKeys, workspaces, cacheWorkspaceKey],
  );

  const value = useMemo<VaultSessionValue>(
    () => ({
      vault,
      recovery,
      workspaces,
      workspaceKeys,
      clearRecovery,
      lock,
      setupVault,
      unlockVault,
      refreshWorkspaces,
      createWorkspace,
      renameWorkspace,
      removeWorkspace,
      getWorkspaceKey,
    }),
    [
      vault,
      recovery,
      workspaces,
      workspaceKeys,
      clearRecovery,
      lock,
      setupVault,
      unlockVault,
      refreshWorkspaces,
      createWorkspace,
      renameWorkspace,
      removeWorkspace,
      getWorkspaceKey,
    ],
  );

  return (
    <VaultSessionContext.Provider value={value}>
      {children}
    </VaultSessionContext.Provider>
  );
}

export function useVaultSession(): VaultSessionValue {
  const ctx = useContext(VaultSessionContext);
  if (!ctx) {
    throw new Error("useVaultSession must be used within VaultSessionProvider");
  }
  return ctx;
}

export { hasUserCrypto };
