"use client";

import { InvitationInbox } from "@/components/app/invitation-inbox";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";

export default function InvitationsPage() {
  const { userKeys } = useCryptoSession();

  if (!userKeys) {
    return (
      <main className="p-6 text-sm text-muted-foreground">
        Unlock with your passkey to manage invitations.
      </main>
    );
  }

  return <InvitationInbox userId={userKeys.userId} />;
}
