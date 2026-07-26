"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";

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
import { storeLastWorkspaceId } from "@/lib/client-crypto/workspaces";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";

type WorkspaceSwitcherProps = {
  userId: string;
  activeWorkspaceId: string | null;
};

export function WorkspaceSwitcher({
  userId,
  activeWorkspaceId,
}: WorkspaceSwitcherProps) {
  const t = useTranslations("shell");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { workspaces, createWorkspace, renameWorkspace } = useCryptoSession();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  function selectWorkspace(id: string) {
    storeLastWorkspaceId(userId, id);
    router.push(`/app/w/${id}`);
  }

  async function onCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    try {
      const created = await createWorkspace(trimmed);
      setCreateOpen(false);
      setName("");
      selectWorkspace(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createFailed"));
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
      setError(err instanceof Error ? err.message : t("renameFailed"));
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
            {active?.name ?? t("workspaces")}
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
              {workspace.kind === "personal" ? (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {t("personal")}
                </span>
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setError(null);
              setName("");
              setCreateOpen(true);
            }}
          >
            <PlusIcon className="size-3.5" />
            {t("newWorkspace")}
          </DropdownMenuItem>
          {active ? (
            <DropdownMenuItem
              onClick={() => {
                setError(null);
                setName(active.name);
                setRenameOpen(true);
              }}
            >
              {t("renameEllipsis")}
            </DropdownMenuItem>
          ) : null}
          {active ? (
            <DropdownMenuItem
              onClick={() =>
                router.push(`/app/w/${active.id}/settings/general`)
              }
            >
              {tSettings("workspaceSettings")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newWorkspace")}</DialogTitle>
            <DialogDescription>
              {t("newWorkspaceDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-create-name" required>
              {tSettings("name")}
            </Label>
            <Input
              id="ws-create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholderTeam")}
              maxLength={120}
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onCreate();
              }}
            />
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setCreateOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              disabled={pending || !name.trim()}
              onClick={() => void onCreate()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("renameWorkspace")}</DialogTitle>
            <DialogDescription>
              {t("renameWorkspaceDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-rename-name" required>
              {tSettings("name")}
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
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setRenameOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              disabled={pending || !name.trim()}
              onClick={() => void onRename()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
