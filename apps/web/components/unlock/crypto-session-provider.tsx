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
  leaveWorkspace as leaveWorkspaceApi,
  listWorkspaces,
  patchWorkspace,
  getMeCrypto,
} from "@/lib/api/v1-client";
import { createPrfUnlock, assertPrfUnlock } from "@/lib/client-crypto/prf";
import {
  createRecoveryExport,
  parseRecoveryFileJson,
  unwrapUserSymmetricKeyFromRecovery,
  type RecoveryExport,
} from "@/lib/client-crypto/recovery";
import {
  setupUserKeys,
  unlockUserKeys,
  unlockWithUserSymmetricKey,
  type UnlockedUserKeys,
} from "@/lib/client-crypto/user-keys";
import { defaultCategorizations } from "@/lib/client-crypto/categorizations";
import {
  createStandardWorkspace,
  decryptWorkspaceListItem,
  encryptWorkspaceName,
  ensurePersonalWorkspace,
  unwrapWorkspaceKey,
  type DecryptedWorkspaceListItem,
} from "@/lib/client-crypto/workspaces";
import { toWorkspacePlaintext } from "@/lib/client-crypto/workspace-plaintext";

type CryptoSessionValue = {
  userKeys: UnlockedUserKeys | null;
  recovery: RecoveryExport | null;
  workspaces: DecryptedWorkspaceListItem[];
  workspaceKeys: ReadonlyMap<string, Uint8Array>;
  clearRecovery: () => void;
  lock: () => void;
  setupUserCrypto: (userId: string, email: string) => Promise<void>;
  unlockUserCrypto: (userId: string) => Promise<void>;
  unlockUserCryptoWithRecoveryFile: (
    userId: string,
    file: File,
  ) => Promise<void>;
  refreshWorkspaces: () => Promise<DecryptedWorkspaceListItem[]>;
  createWorkspace: (
    name: string,
    options?: { asPro?: boolean },
  ) => Promise<DecryptedWorkspaceListItem>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  removeWorkspace: (workspaceId: string) => Promise<void>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
  getWorkspaceKey: (workspaceId: string) => Promise<Uint8Array>;
};

const CryptoSessionContext = createContext<CryptoSessionValue | null>(null);

export function CryptoSessionProvider({ children }: { children: ReactNode }) {
  const [userKeys, setUserKeys] = useState<UnlockedUserKeys | null>(null);
  const [recovery, setRecovery] = useState<RecoveryExport | null>(null);
  const [workspaces, setWorkspaces] = useState<DecryptedWorkspaceListItem[]>(
    [],
  );
  const [workspaceKeys, setWorkspaceKeys] = useState<Map<string, Uint8Array>>(
    () => new Map(),
  );

  const lock = useCallback(() => {
    setUserKeys(null);
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

  const loadWorkspaces = useCallback(async (unlocked: UnlockedUserKeys) => {
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
            categorizations: defaultCategorizations(),
            kind: item.kind,
            role: item.role,
            wrappedKey: item.wrappedKey,
            updatedAt: item.updatedAt,
            plan: item.plan,
          };
        }
      }),
    );
    setWorkspaces(decrypted);
    return decrypted;
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    if (!userKeys) {
      throw new Error("Encryption is locked");
    }
    return loadWorkspaces(userKeys);
  }, [userKeys, loadWorkspaces]);

  const afterUnlocked = useCallback(
    async (unlocked: UnlockedUserKeys) => {
      await ensurePersonalWorkspace(unlocked);
      await loadWorkspaces(unlocked);
      setUserKeys(unlocked);
    },
    [loadWorkspaces],
  );

  const setupUserCrypto = useCallback(
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

  const unlockUserCrypto = useCallback(
    async (userId: string) => {
      const row = await getMeCrypto();
      const prf = await assertPrfUnlock(userId, row.prfSalt);
      const unlocked = await unlockUserKeys(userId, prf.unlockKey, row);
      await afterUnlocked(unlocked);
    },
    [afterUnlocked],
  );

  const unlockUserCryptoWithRecoveryFile = useCallback(
    async (userId: string, file: File) => {
      const text = await file.text();
      const parsed = parseRecoveryFileJson(text);
      const userSymmetricKey = await unwrapUserSymmetricKeyFromRecovery(
        userId,
        parsed,
      );
      const unlocked = await unlockWithUserSymmetricKey(
        userId,
        parsed.recoveryKey,
        userSymmetricKey,
      );
      await afterUnlocked(unlocked);
    },
    [afterUnlocked],
  );

  const getWorkspaceKey = useCallback(
    async (workspaceId: string) => {
      if (!userKeys) {
        throw new Error("Encryption is locked");
      }
      const cached = workspaceKeys.get(workspaceId);
      if (cached) return cached;
      const item = workspaces.find((w) => w.id === workspaceId);
      if (!item) {
        throw new Error("Workspace not found");
      }
      const key = await unwrapWorkspaceKey(
        userKeys,
        workspaceId,
        item.wrappedKey,
      );
      cacheWorkspaceKey(workspaceId, key);
      return key;
    },
    [userKeys, workspaceKeys, workspaces, cacheWorkspaceKey],
  );

  const createWorkspace = useCallback(
    async (name: string, options?: { asPro?: boolean }) => {
      if (!userKeys) {
        throw new Error("Encryption is locked");
      }
      const created = await createStandardWorkspace(userKeys, name, options);
      const key = await unwrapWorkspaceKey(
        userKeys,
        created.id,
        created.wrappedKey,
      );
      cacheWorkspaceKey(created.id, key);
      const listed = await loadWorkspaces(userKeys);
      return listed.find((w) => w.id === created.id) ?? created;
    },
    [userKeys, cacheWorkspaceKey, loadWorkspaces],
  );

  const renameWorkspace = useCallback(
    async (workspaceId: string, name: string) => {
      if (!userKeys) {
        throw new Error("Encryption is locked");
      }
      const workspaceKey = await getWorkspaceKey(workspaceId);
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (!workspace) {
        throw new Error("Workspace not found");
      }
      const encryptedBlob = await encryptWorkspaceName(
        workspaceKey,
        workspaceId,
        toWorkspacePlaintext(name, workspace.categorizations),
        userKeys.keyVersion,
      );
      await patchWorkspace(workspaceId, { encryptedBlob });
      await loadWorkspaces(userKeys);
    },
    [userKeys, workspaces, getWorkspaceKey, loadWorkspaces],
  );

  const dropWorkspaceLocal = useCallback((workspaceId: string) => {
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
    setWorkspaceKeys((prev) => {
      const next = new Map(prev);
      next.delete(workspaceId);
      return next;
    });
  }, []);

  const removeWorkspace = useCallback(
    async (workspaceId: string) => {
      await deleteWorkspace(workspaceId);
      dropWorkspaceLocal(workspaceId);
    },
    [dropWorkspaceLocal],
  );

  const leaveWorkspace = useCallback(
    async (workspaceId: string) => {
      await leaveWorkspaceApi(workspaceId);
      dropWorkspaceLocal(workspaceId);
    },
    [dropWorkspaceLocal],
  );

  const value = useMemo<CryptoSessionValue>(
    () => ({
      userKeys,
      recovery,
      workspaces,
      workspaceKeys,
      clearRecovery,
      lock,
      setupUserCrypto,
      unlockUserCrypto,
      unlockUserCryptoWithRecoveryFile,
      refreshWorkspaces,
      createWorkspace,
      renameWorkspace,
      removeWorkspace,
      leaveWorkspace,
      getWorkspaceKey,
    }),
    [
      userKeys,
      recovery,
      workspaces,
      workspaceKeys,
      clearRecovery,
      lock,
      setupUserCrypto,
      unlockUserCrypto,
      unlockUserCryptoWithRecoveryFile,
      refreshWorkspaces,
      createWorkspace,
      renameWorkspace,
      removeWorkspace,
      leaveWorkspace,
      getWorkspaceKey,
    ],
  );

  return (
    <CryptoSessionContext.Provider value={value}>
      {children}
    </CryptoSessionContext.Provider>
  );
}

export function useCryptoSession(): CryptoSessionValue {
  const ctx = useContext(CryptoSessionContext);
  if (!ctx) {
    throw new Error(
      "useCryptoSession must be used within CryptoSessionProvider",
    );
  }
  return ctx;
}
