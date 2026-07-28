"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { GetMeAccountResponse } from "@helvety-cloud/api-contract";

import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { deleteAccount, getMeAccount } from "@/lib/api/v1-client";
import { createClient } from "@/lib/supabase/client";
import { clearStoredPrfCredentialId } from "@/lib/client-crypto/prf";

type AccountSettingsContextValue = {
  account: GetMeAccountResponse | null;
  error: string | null;
  pending: boolean;
  confirmEmail: string;
  setConfirmEmail: (value: string) => void;
  cleanupAck: boolean;
  setCleanupAck: (value: boolean) => void;
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  canSubmit: boolean;
  onDeleteAccount: () => Promise<void>;
};

const AccountSettingsContext =
  createContext<AccountSettingsContextValue | null>(null);

export function AccountSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lock } = useCryptoSession();
  const [account, setAccount] = useState<GetMeAccountResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [cleanupAck, setCleanupAck] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getMeAccount();
        if (!cancelled) setAccount(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load account",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onDeleteAccount() {
    if (!account) return;
    setPending(true);
    setError(null);
    try {
      await deleteAccount();
      clearStoredPrfCredentialId(account.userId);
      lock();
      await createClient().auth.signOut();
      window.location.href = "/?account-deleted=1";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion failed");
      setPending(false);
      throw err;
    }
  }

  const canSubmit = Boolean(
    account && confirmEmail === account.email && cleanupAck && !pending,
  );

  const value: AccountSettingsContextValue = {
    account,
    error,
    pending,
    confirmEmail,
    setConfirmEmail,
    cleanupAck,
    setCleanupAck,
    deleteOpen,
    setDeleteOpen,
    canSubmit,
    onDeleteAccount,
  };

  return (
    <AccountSettingsContext.Provider value={value}>
      {children}
    </AccountSettingsContext.Provider>
  );
}

export function useAccountSettings(): AccountSettingsContextValue {
  const ctx = useContext(AccountSettingsContext);
  if (!ctx) {
    throw new Error(
      "useAccountSettings must be used within AccountSettingsProvider",
    );
  }
  return ctx;
}
