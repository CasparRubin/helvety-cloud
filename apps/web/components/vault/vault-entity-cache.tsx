"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { EntityLinkKind } from "@helvety-cloud/api-contract";

import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  findOption,
  type ProjectCategorizations,
} from "@/lib/vault/categorizations";
import { loadDecryptedContacts, type DecryptedContact } from "@/lib/vault/contacts";
import type { EntityColor } from "@/lib/vault/entity-colors";
import { loadDecryptedNotes, type DecryptedNote } from "@/lib/vault/notes";
import {
  loadDecryptedProjects,
  type DecryptedProject,
} from "@/lib/vault/projects";
import { loadDecryptedTasks, type DecryptedTask } from "@/lib/vault/tasks";

export type ResolvedEntity = {
  kind: EntityLinkKind;
  id: string;
  label: string;
  color?: EntityColor;
  href: string | null;
  deleted: boolean;
  done: boolean;
  badges?: { key: string; label: string }[];
};

type VaultEntityCacheValue = {
  notes: DecryptedNote[];
  tasks: DecryptedTask[];
  contacts: DecryptedContact[];
  projects: DecryptedProject[];
  resolve: (kind: EntityLinkKind, id: string) => ResolvedEntity;
  upsertNote: (note: DecryptedNote) => void;
  upsertTask: (task: DecryptedTask) => void;
  upsertContact: (contact: DecryptedContact) => void;
};

const VaultEntityCacheContext = createContext<VaultEntityCacheValue | null>(
  null,
);

function doneStageIds(cats: ProjectCategorizations): Set<string> {
  const done = new Set<string>();
  for (const s of cats.stages) {
    const n = s.name.trim().toLowerCase();
    if (n === "done" || n === "cancelled" || n === "canceled") {
      done.add(s.id);
    }
  }
  return done;
}

function upsertById<T extends { id: string }>(prev: T[], item: T): T[] {
  const i = prev.findIndex((x) => x.id === item.id);
  if (i < 0) return [...prev, item];
  const next = prev.slice();
  next[i] = item;
  return next;
}

export function VaultEntityCacheProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  const { vault, getWorkspaceKey } = useVaultSession();
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [tasks, setTasks] = useState<DecryptedTask[]>([]);
  const [contacts, setContacts] = useState<DecryptedContact[]>([]);
  const [projects, setProjects] = useState<DecryptedProject[]>([]);
  const genRef = useRef(0);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      const gen = ++genRef.current;
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled || gen !== genRef.current) return;
        const projectsPage = await loadDecryptedProjects(workspaceId, key, {
          limit: 100,
        });
        if (cancelled || gen !== genRef.current) return;

        const allTasks: DecryptedTask[] = [];
        for (const project of projectsPage.projects) {
          const page = await loadDecryptedTasks(workspaceId, project.id, key, {
            limit: 100,
          });
          allTasks.push(...page.tasks);
        }
        if (cancelled || gen !== genRef.current) return;

        const [notesPage, contactsPage] = await Promise.all([
          loadDecryptedNotes(workspaceId, key, { limit: 100 }),
          loadDecryptedContacts(workspaceId, key, { limit: 100 }),
        ]);
        if (cancelled || gen !== genRef.current) return;

        setProjects(projectsPage.projects);
        setTasks(allTasks);
        setNotes(notesPage.notes);
        setContacts(contactsPage.contacts);
      } catch {
        // Leave cache empty; chips fall back to kind labels.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, getWorkspaceKey]);

  const projectById = useMemo(() => {
    const m = new Map<string, DecryptedProject>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const resolve = useCallback(
    (kind: EntityLinkKind, id: string): ResolvedEntity => {
      switch (kind) {
        case "note": {
          const note = notes.find((n) => n.id === id);
          return {
            kind,
            id,
            label: note?.title ?? "Note",
            color: note?.color,
            href: `/app/w/${workspaceId}/notes/${id}`,
            deleted: Boolean(note?.deletedAt),
            done: false,
          };
        }
        case "contact": {
          const contact = contacts.find((c) => c.id === id);
          return {
            kind,
            id,
            label: contact?.displayName ?? "Contact",
            color: contact?.color,
            href: `/app/w/${workspaceId}/contacts/${id}`,
            deleted: Boolean(contact?.deletedAt),
            done: false,
          };
        }
        case "project": {
          const project = projects.find((p) => p.id === id);
          return {
            kind,
            id,
            label: project?.name ?? "Project",
            color: project?.color,
            href: `/app/w/${workspaceId}/p/${id}`,
            deleted: Boolean(project?.deletedAt),
            done: false,
          };
        }
        case "task": {
          const task = tasks.find((t) => t.id === id);
          const project = task ? projectById.get(task.projectId) : undefined;
          const cats = project?.categorizations;
          const stage = cats
            ? findOption(cats.stages, task?.stageId ?? null)
            : null;
          const priority = cats
            ? findOption(cats.priorities, task?.priorityId ?? null)
            : null;
          const label = cats
            ? findOption(cats.labels, task?.labelId ?? null)
            : null;
          const done = Boolean(
            task && cats && doneStageIds(cats).has(task.stageId ?? ""),
          );
          const badges: { key: string; label: string }[] = [];
          if (stage?.name) badges.push({ key: "stage", label: stage.name });
          if (priority?.name)
            badges.push({ key: "priority", label: priority.name });
          if (label?.name) badges.push({ key: "label", label: label.name });
          return {
            kind,
            id,
            label: task?.title ?? "Task",
            color: project?.color,
            href: task
              ? `/app/w/${workspaceId}/p/${task.projectId}/t/${id}`
              : null,
            deleted: Boolean(task?.deletedAt),
            done,
            badges,
          };
        }
        default: {
          const _exhaustive: never = kind;
          return {
            kind: _exhaustive,
            id,
            label: "Unknown",
            href: null,
            deleted: false,
            done: false,
          };
        }
      }
    },
    [notes, contacts, projects, tasks, projectById, workspaceId],
  );

  const value = useMemo<VaultEntityCacheValue>(
    () => ({
      notes,
      tasks,
      contacts,
      projects,
      resolve,
      upsertNote: (note) => setNotes((prev) => upsertById(prev, note)),
      upsertTask: (task) => setTasks((prev) => upsertById(prev, task)),
      upsertContact: (contact) =>
        setContacts((prev) => upsertById(prev, contact)),
    }),
    [notes, tasks, contacts, projects, resolve],
  );

  return (
    <VaultEntityCacheContext.Provider value={value}>
      {children}
    </VaultEntityCacheContext.Provider>
  );
}

export function useVaultEntityCache(): VaultEntityCacheValue {
  const ctx = useContext(VaultEntityCacheContext);
  if (!ctx) {
    throw new Error("useVaultEntityCache must be used within provider");
  }
  return ctx;
}

export function useOptionalVaultEntityCache(): VaultEntityCacheValue | null {
  return useContext(VaultEntityCacheContext);
}
