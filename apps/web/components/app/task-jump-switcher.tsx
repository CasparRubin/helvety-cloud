"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";

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
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { loadDecryptedTasks, type DecryptedTask } from "@/lib/client-crypto/tasks";
import { useRouter } from "@/i18n/navigation";

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
  const { userKeys, getWorkspaceKey } = useCryptoSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<DecryptedTask[]>([]);

  const loadTasks = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    const page = await loadDecryptedTasks(workspaceId, projectId, key, {
      limit: 100,
    });
    return page.tasks;
  }, [getWorkspaceKey, workspaceId, projectId]);

  const refresh = useCallback(async () => {
    setTasks(await loadTasks());
  }, [loadTasks]);

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadTasks();
        if (!cancelled) setTasks(next);
      } catch {
        if (!cancelled) setTasks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, loadTasks]);

  useEffect(() => {
    if (!userKeys) return;
    const onChange = () => {
      void refresh().catch(() => undefined);
    };
    window.addEventListener("helvety:tasks-changed", onChange);
    return () => {
      window.removeEventListener("helvety:tasks-changed", onChange);
    };
  }, [userKeys, refresh]);

  const active = tasks.find((task) => task.id === taskId);
  const activeName = active ? active.title || "Untitled task" : "…";
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? tasks.filter((task) =>
        (task.title || "Untitled task")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : tasks;

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
            variant="ghost"
            size="sm"
            className="h-8 max-w-[9rem] justify-between gap-2 px-2 font-normal sm:max-w-[14rem]"
          />
        }
      >
        <span className="truncate text-left text-sm">{activeName}</span>
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
            {filtered.map((task) => (
              <CommandItem
                key={task.id}
                value={task.id}
                data-checked={task.id === taskId}
                onSelect={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(
                    `/app/w/${workspaceId}/p/${projectId}/t/${task.id}`,
                  );
                }}
              >
                <span className="truncate">
                  {task.title || "Untitled task"}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
