"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  setupUserKeys,
  unlockUserKeys,
  type UnlockedVault,
} from "@/lib/vault/user-keys";
import {
  createStandardWorkspace,
  decryptWorkspaceListItem,
  encryptWorkspaceName,
  ensurePersonalWorkspace,
  unwrapWorkspaceKey,
  type DecryptedWorkspaceListItem,
} from "@/lib/vault/workspaces";

type VaultSessionValue = {
  vault: UnlockedVault | null;
  recovery: RecoveryExport | null;
  workspaces: DecryptedWorkspaceListItem[];
  workspaceKeys: ReadonlyMap<string, Uint8Array>;
  clearRecovery: () => void;
  lock: () => void;
  setupVault: (userId: string, email: string) => Promise<void>;
  unlockVault: (userId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<DecryptedWorkspaceListItem[]>;
  createWorkspace: (name: string) => Promise<DecryptedWorkspaceListItem>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  removeWorkspace: (workspaceId: string) => Promise<void>;
  getWorkspaceKey: (workspaceId: string) => Promise<Uint8Array>;
};

const VaultSessionContext = createContext<VaultSessionValue | null>(null);

export function VaultSessionProvider({ children }: { children: ReactNode }) {
  const [vault, setVault] = useState<UnlockedVault | null>(null);
  const [recovery, setRecovery] = useState<RecoveryExport | null>(null);
  const [workspaces, setWorkspaces] = useState<DecryptedWorkspaceListItem[]>(
    [],
  );
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

  const loadWorkspaces = useCallback(async (unlocked: UnlockedVault) => {
    const listed = await listWorkspaces();
    const decrypted = await Promise.all(
      listed.workspaces.map(async (item) => {
        try {
          return await decryptWorkspaceListItem(unlocked, item);
        } catch {
          // One unreadable workspace must not lock the user out of the others.
          return {
            id: item.id,
            name: "Unable to decrypt",
            kind: item.kind,
            role: item.role,
            wrappedKey: item.wrappedKey,
            updatedAt: item.updatedAt,
          };
        }
      }),
    );
    setWorkspaces(decrypted);
    return decrypted;
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    if (!vault) {
      throw new Error("Vault is locked");
    }
    return loadWorkspaces(vault);
  }, [vault, loadWorkspaces]);

  const afterUnlocked = useCallback(
    async (unlocked: UnlockedVault) => {
      await ensurePersonalWorkspace(unlocked);
      await loadWorkspaces(unlocked);
      setVault(unlocked);
    },
    [loadWorkspaces],
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
      const listed = await loadWorkspaces(vault);
      return listed.find((w) => w.id === created.id) ?? created;
    },
    [vault, cacheWorkspaceKey, loadWorkspaces],
  );

  const renameWorkspace = useCallback(
    async (workspaceId: string, name: string) => {
      if (!vault) {
        throw new Error("Vault is locked");
      }
      const workspaceKey = await getWorkspaceKey(workspaceId);
      const encryptedBlob = await encryptWorkspaceName(
        workspaceKey,
        workspaceId,
        name,
        vault.keyVersion,
      );
      await patchWorkspace(workspaceId, { encryptedBlob });
      await loadWorkspaces(vault);
    },
    [vault, getWorkspaceKey, loadWorkspaces],
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
