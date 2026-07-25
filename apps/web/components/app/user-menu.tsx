"use client";

import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  CircleUserRoundIcon,
  LogOutIcon,
  MailIcon,
  ScaleIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import { createClient } from "@/lib/supabase/client";

type UserMenuProps = {
  email: string;
};

export function UserMenu({ email }: UserMenuProps) {
  const router = useRouter();
  const { lock } = useVaultSession();

  async function signOut() {
    lock();
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 max-w-[14rem] gap-1.5 px-2 font-normal"
          />
        }
      >
        <CircleUserRoundIcon className="size-4 shrink-0 opacity-60" />
        <span className="hidden truncate text-sm sm:inline">{email}</span>
        <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/app/invitations")}>
          <MailIcon className="size-4 shrink-0 opacity-60" />
          Invitations
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/legal")}>
          <ScaleIcon className="size-4 shrink-0 opacity-60" />
          Legal
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOutIcon className="size-4 shrink-0 opacity-60" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
