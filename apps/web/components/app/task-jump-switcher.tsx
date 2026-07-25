"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronsUpDownIcon, CircleDashedIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import { loadDecryptedTasks, type DecryptedTask } from "@/lib/vault/tasks";

const LOAD_LIMIT = 100;

type TaskJumpSwitcherProps = {
  workspaceId: string;
  projectId: string;
  taskId: string;
};

export function TaskJumpSwitcher({
  workspaceId,
  projectId,
  taskId,
}: TaskJumpSwitcherProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<DecryptedTask[]>([]);

  const refresh = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    const page = await loadDecryptedTasks(workspaceId, projectId, key, {
      limit: LOAD_LIMIT,
    });
    setTasks(page.tasks);
  }, [getWorkspaceKey, workspaceId, projectId]);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const page = await loadDecryptedTasks(workspaceId, projectId, key, {
          limit: LOAD_LIMIT,
        });
        if (cancelled) return;
        setTasks(page.tasks);
      } catch {
        if (cancelled) return;
        setTasks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, projectId, getWorkspaceKey]);

  useEffect(() => {
    if (!vault) return;
    const onChange = () => {
      void refresh().catch(() => undefined);
    };
    window.addEventListener("helvety:tasks-changed", onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener("helvety:tasks-changed", onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [vault, refresh]);

  const entries = useMemo(
    () =>
      tasks.map((task) => ({
        id: task.id,
        name: task.title || "Untitled task",
        href: `/app/w/${workspaceId}/p/${projectId}/t/${task.id}`,
      })),
    [tasks, workspaceId, projectId],
  );

  const activeEntry = useMemo(
    () => entries.find((entry) => entry.id === taskId) ?? null,
    [entries, taskId],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      normalizedQuery
        ? entries.filter((entry) =>
            entry.name.toLowerCase().includes(normalizedQuery),
          )
        : entries,
    [entries, normalizedQuery],
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          void refresh().catch(() => undefined);
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 max-w-[14rem] justify-between gap-2 px-2 font-normal"
          />
        }
      >
        <span className="truncate text-left text-sm">
          {activeEntry?.name ?? "…"}
        </span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search tasks…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>No matches.</CommandEmpty>
            ) : null}
            {filtered.map((entry) => (
              <CommandItem
                key={entry.id}
                value={entry.id}
                data-checked={entry.id === taskId}
                onSelect={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(entry.href);
                }}
              >
                <CircleDashedIcon className="size-4 shrink-0 opacity-60" />
                <span className="truncate">{entry.name}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
