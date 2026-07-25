"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronsUpDownIcon,
  ContactIcon,
  FolderKanbanIcon,
  StickyNoteIcon,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
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
import type { AppNavEntity } from "@/components/app/workspace-nav";
import {
  loadDecryptedContacts,
  type DecryptedContact,
} from "@/lib/vault/contacts";
import { loadDecryptedNotes, type DecryptedNote } from "@/lib/vault/notes";
import {
  loadDecryptedProjects,
  type DecryptedProject,
} from "@/lib/vault/projects";

const LOAD_LIMIT = 100;

type WorkspaceJumpSwitcherProps = {
  workspaceId: string;
  active: AppNavEntity;
};

type JumpEntryKind = AppNavEntity["kind"];

type JumpEntry = {
  kind: JumpEntryKind;
  id: string;
  name: string;
  href: string;
};

const entryIcons: Record<JumpEntryKind, LucideIcon> = {
  project: FolderKanbanIcon,
  note: StickyNoteIcon,
  contact: ContactIcon,
};

export function WorkspaceJumpSwitcher({
  workspaceId,
  active,
}: WorkspaceJumpSwitcherProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<DecryptedProject[]>([]);
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [contacts, setContacts] = useState<DecryptedContact[]>([]);

  const refresh = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    const [projectsPage, notesPage, contactsPage] = await Promise.all([
      loadDecryptedProjects(workspaceId, key, { limit: LOAD_LIMIT }),
      loadDecryptedNotes(workspaceId, key, { limit: LOAD_LIMIT }),
      loadDecryptedContacts(workspaceId, key, { limit: LOAD_LIMIT }),
    ]);
    setProjects(projectsPage.projects);
    setNotes(notesPage.notes);
    setContacts(contactsPage.contacts);
  }, [getWorkspaceKey, workspaceId]);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const [projectsPage, notesPage, contactsPage] = await Promise.all([
          loadDecryptedProjects(workspaceId, key, { limit: LOAD_LIMIT }),
          loadDecryptedNotes(workspaceId, key, { limit: LOAD_LIMIT }),
          loadDecryptedContacts(workspaceId, key, { limit: LOAD_LIMIT }),
        ]);
        if (cancelled) return;
        setProjects(projectsPage.projects);
        setNotes(notesPage.notes);
        setContacts(contactsPage.contacts);
      } catch {
        if (cancelled) return;
        setProjects([]);
        setNotes([]);
        setContacts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, getWorkspaceKey]);

  useEffect(() => {
    if (!vault) return;
    const onChange = () => {
      void refresh().catch(() => undefined);
    };
    window.addEventListener("helvety:projects-changed", onChange);
    window.addEventListener("helvety:notes-changed", onChange);
    window.addEventListener("helvety:contacts-changed", onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener("helvety:projects-changed", onChange);
      window.removeEventListener("helvety:notes-changed", onChange);
      window.removeEventListener("helvety:contacts-changed", onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [vault, refresh]);

  const entries = useMemo<Record<JumpEntryKind, JumpEntry[]>>(() => {
    const base = `/app/w/${workspaceId}`;
    return {
      project: projects.map((p) => ({
        kind: "project" as const,
        id: p.id,
        name: p.name,
        href: `${base}/p/${p.id}`,
      })),
      note: notes.map((n) => ({
        kind: "note" as const,
        id: n.id,
        name: n.title || "Untitled note",
        href: `${base}/notes/${n.id}`,
      })),
      contact: contacts.map((c) => ({
        kind: "contact" as const,
        id: c.id,
        name: c.displayName || "Unnamed contact",
        href: `${base}/contacts/${c.id}`,
      })),
    };
  }, [workspaceId, projects, notes, contacts]);

  const activeEntry = useMemo(
    () => entries[active.kind].find((e) => e.id === active.id) ?? null,
    [active.kind, active.id, entries],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return entries;
    return {
      project: entries.project.filter((e) =>
        e.name.toLowerCase().includes(normalizedQuery),
      ),
      note: entries.note.filter((e) =>
        e.name.toLowerCase().includes(normalizedQuery),
      ),
      contact: entries.contact.filter((e) =>
        e.name.toLowerCase().includes(normalizedQuery),
      ),
    };
  }, [entries, normalizedQuery]);

  const nothingFound =
    filtered.project.length === 0 &&
    filtered.note.length === 0 &&
    filtered.contact.length === 0;

  const groups: { heading: string; items: JumpEntry[] }[] = [
    { heading: "Projects", items: filtered.project },
    { heading: "Notes", items: filtered.note },
    { heading: "Contacts", items: filtered.contact },
  ];

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
            placeholder="Search projects, notes, contacts…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {nothingFound ? <CommandEmpty>No matches.</CommandEmpty> : null}
            {groups.map((group) =>
              group.items.length > 0 ? (
                <CommandGroup key={group.heading} heading={group.heading}>
                  {group.items.map((entry) => {
                    const EntryIcon = entryIcons[entry.kind];
                    return (
                      <CommandItem
                        key={`${entry.kind}:${entry.id}`}
                        value={`${entry.kind}:${entry.id}`}
                        data-checked={
                          entry.kind === active.kind && entry.id === active.id
                        }
                        onSelect={() => {
                          setOpen(false);
                          setQuery("");
                          router.push(entry.href);
                        }}
                      >
                        <EntryIcon className="size-4 shrink-0 opacity-60" />
                        <span className="truncate">{entry.name}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null,
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
