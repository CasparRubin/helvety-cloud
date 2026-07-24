"use client";

import { InvitationInbox } from "@/components/app/invitation-inbox";
import { useVaultSession } from "@/components/vault/vault-session-provider";

export default function InvitationsPage() {
  const { vault } = useVaultSession();

  if (!vault) {
    return (
      <main className="p-6 text-sm text-muted-foreground">
        Unlock your vault to manage invitations.
      </main>
    );
  }

  return <InvitationInbox userId={vault.userId} />;
}
