"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  CrownIcon,
  PlusIcon,
} from "lucide-react";

import {
  isLimitExceededError,
  LimitExceededInline,
} from "@/components/app/limit-exceeded-notice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { ApiClientError, createBillingCheckout } from "@/lib/api/v1-client";
import { storeLastWorkspaceId } from "@/lib/client-crypto/workspaces";
import { cn } from "@/lib/utils";

type WorkspaceSwitcherProps = {
  userId: string;
  activeWorkspaceId: string | null;
};

export function WorkspaceSwitcher({
  userId,
  activeWorkspaceId,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { workspaces, createWorkspace, renameWorkspace } = useCryptoSession();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);

  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  function selectWorkspace(id: string) {
    storeLastWorkspaceId(userId, id);
    router.push(`/app/w/${id}`);
  }

  async function onCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    setLimitExceeded(false);
    let createdId: string | null = null;
    try {
      // Dialog creates standard workspaces beyond the free Personal slot.
      const created = await createWorkspace(trimmed, { asPro: true });
      createdId = created.id;
      storeLastWorkspaceId(userId, created.id);
      const { url } = await createBillingCheckout(created.id);
      window.location.assign(url);
    } catch (err) {
      if (createdId) {
        const detail =
          err instanceof ApiClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Checkout failed";
        setLimitExceeded(false);
        setError(
          `${detail} The workspace was created. Open Workspace settings → Billing to finish Pro checkout.`,
        );
        setCreateOpen(false);
        setName("");
        selectWorkspace(createdId);
        return;
      }
      setLimitExceeded(isLimitExceededError(err));
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  async function onRename() {
    if (!active) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    try {
      await renameWorkspace(active.id, trimmed);
      setRenameOpen(false);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 max-w-[8rem] justify-between gap-2 px-2 font-normal sm:max-w-[10rem]"
            />
          }
        >
          <span className="truncate text-left text-sm">
            {active?.name ?? "Workspaces"}
          </span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => selectWorkspace(workspace.id)}
              className="gap-2"
            >
              <CheckIcon
                className={cn(
                  "size-3.5",
                  workspace.id === activeWorkspaceId
                    ? "opacity-100"
                    : "opacity-0",
                )}
              />
              <span className="truncate">{workspace.name}</span>
              {workspace.plan === "pro" ? (
                <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <CrownIcon className="size-3 shrink-0" />
                  Pro
                </span>
              ) : (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Free
                </span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setError(null);
              setLimitExceeded(false);
              setName("");
              setCreateOpen(true);
            }}
          >
            <PlusIcon className="size-3.5" />
            New Pro workspace
          </DropdownMenuItem>
          {active ? (
            <DropdownMenuItem
              onClick={() => {
                setError(null);
                setLimitExceeded(false);
                setName(active.name);
                setRenameOpen(true);
              }}
            >
              Rename…
            </DropdownMenuItem>
          ) : null}
          {active ? (
            <DropdownMenuItem
              onClick={() =>
                router.push(`/app/w/${active.id}/settings/general`)
              }
            >
              Workspace settings
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Pro Workspace</DialogTitle>
            <DialogDescription>
              Each account includes one Free Workspace (your Personal
              workspace). Additional owned workspaces require Pro Workspace.
              After you create this workspace, Stripe Checkout opens so you can
              start the yearly subscription. Any member can manage billing
              afterward.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-create-name" required>
              Name
            </Label>
            <Input
              id="ws-create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team workspace"
              maxLength={120}
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onCreate();
              }}
            />
            {error ? (
              limitExceeded ? (
                <LimitExceededInline
                  message={error}
                  workspaceId={active?.id}
                  href={active ? undefined : "/pricing"}
                />
              ) : (
                <p className="text-xs text-destructive">{error}</p>
              )
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !name.trim()}
              onClick={() => void onCreate()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Create and checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
            <DialogDescription>
              Updates the display name. Kind (Personal vs standard) cannot
              change.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-rename-name" required>
              Name
            </Label>
            <Input
              id="ws-rename-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onRename();
              }}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !name.trim()}
              onClick={() => void onRename()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
