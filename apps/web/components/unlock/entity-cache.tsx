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

import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import type { CategorizationIcon } from "@/lib/client-crypto/categorization-icons";
import {
  findOption,
  resolveStageColor,
  type ProjectCategorizations,
} from "@/lib/client-crypto/categorizations";
import { loadDecryptedContacts, type DecryptedContact } from "@/lib/client-crypto/contacts";
import { formatContactName } from "@/lib/client-crypto/contact-plaintext";
import {
  KIND_FALLBACK_COLOR,
  type EntityColor,
} from "@/lib/client-crypto/entity-colors";
import { loadDecryptedNotes, type DecryptedNote } from "@/lib/client-crypto/notes";
import {
  loadDecryptedProjects,
  type DecryptedProject,
} from "@/lib/client-crypto/projects";
import { loadDecryptedTasks, type DecryptedTask } from "@/lib/client-crypto/tasks";

export type ResolvedEntity = {
  kind: EntityLinkKind;
  id: string;
  label: string;
  color: EntityColor;
  href: string | null;
  deleted: boolean;
  done: boolean;
  badges?: string[];
  /** Task chips: stage icon when resolvable. */
  icon?: CategorizationIcon;
};

type EntityCacheValue = {
  notes: DecryptedNote[];
  tasks: DecryptedTask[];
  contacts: DecryptedContact[];
  projects: DecryptedProject[];
  resolve: (kind: EntityLinkKind, id: string) => ResolvedEntity;
  upsertNote: (note: DecryptedNote) => void;
  upsertTask: (task: DecryptedTask) => void;
  upsertContact: (contact: DecryptedContact) => void;
};

const EntityCacheContext = createContext<EntityCacheValue | null>(
  null,
);

function doneStageIds(cats: ProjectCategorizations): Set<string> {
  const done = new Set<string>();
  for (const s of cats.stages) {
    const n = s.name.trim().toLowerCase();
    if (
      n === "done" ||
      n === "completed" ||
      n === "cancelled" ||
      n === "canceled"
    ) {
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

export function EntityCacheProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  const { userKeys, getWorkspaceKey } = useCryptoSession();
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [tasks, setTasks] = useState<DecryptedTask[]>([]);
  const [contacts, setContacts] = useState<DecryptedContact[]>([]);
  const [projects, setProjects] = useState<DecryptedProject[]>([]);
  const genRef = useRef(0);

  useEffect(() => {
    if (!userKeys) return;
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
        setProjects(projectsPage.projects);

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

        setTasks(allTasks);
        setNotes(notesPage.notes);
        setContacts(contactsPage.contacts);
      } catch {
        // Leave remaining cache empty; chips fall back to kind labels.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, workspaceId, getWorkspaceKey]);

  const refreshProjects = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    const projectsPage = await loadDecryptedProjects(workspaceId, key, {
      limit: 100,
    });
    setProjects(projectsPage.projects);
  }, [getWorkspaceKey, workspaceId]);

  useEffect(() => {
    if (!userKeys) return;
    const onChange = () => {
      void refreshProjects().catch(() => undefined);
    };
    window.addEventListener("helvety:projects-changed", onChange);
    return () => {
      window.removeEventListener("helvety:projects-changed", onChange);
    };
  }, [userKeys, refreshProjects]);

  const projectById = useMemo(() => {
    const m = new Map<string, DecryptedProject>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const resolve = useCallback(
    (kind: EntityLinkKind, id: string): ResolvedEntity => {
      const fallback = KIND_FALLBACK_COLOR[kind];
      switch (kind) {
        case "note": {
          const note = notes.find((n) => n.id === id);
          return {
            kind,
            id,
            label: note?.title ?? "Note",
            color: fallback,
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
            label: (contact && formatContactName(contact)) || "Contact",
            color: contact?.color ?? fallback,
            href: `/app/w/${workspaceId}/contacts/${id}`,
            deleted: Boolean(contact?.deletedAt),
            done: false,
          };
        }
        case "project": {
          const project = projectById.get(id);
          return {
            kind,
            id,
            label: project?.name ?? "Project",
            color: project?.color ?? fallback,
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
          const labelOpt = cats
            ? findOption(cats.labels, task?.labelId ?? null)
            : null;
          const done = Boolean(
            task && cats && doneStageIds(cats).has(task.stageId ?? ""),
          );
          const badges: string[] = [];
          if (stage?.name) badges.push(stage.name);
          if (priority?.name) badges.push(priority.name);
          if (labelOpt?.name) badges.push(labelOpt.name);
          return {
            kind,
            id,
            label: task?.title ?? "Task",
            color: resolveStageColor(stage) ?? fallback,
            href: task
              ? `/app/w/${workspaceId}/p/${task.projectId}/t/${id}`
              : null,
            deleted: Boolean(task?.deletedAt),
            done,
            badges: badges.length > 0 ? badges : undefined,
            icon: stage?.icon,
          };
        }
        default: {
          const _exhaustive: never = kind;
          return {
            kind: _exhaustive,
            id,
            label: "Unknown",
            color: "slate",
            href: null,
            deleted: false,
            done: false,
          };
        }
      }
    },
    [notes, contacts, tasks, projectById, workspaceId],
  );

  const upsertNote = useCallback((note: DecryptedNote) => {
    setNotes((prev) => upsertById(prev, note));
  }, []);
  const upsertTask = useCallback((task: DecryptedTask) => {
    setTasks((prev) => upsertById(prev, task));
  }, []);
  const upsertContact = useCallback((contact: DecryptedContact) => {
    setContacts((prev) => upsertById(prev, contact));
  }, []);

  const value = useMemo<EntityCacheValue>(
    () => ({
      notes,
      tasks,
      contacts,
      projects,
      resolve,
      upsertNote,
      upsertTask,
      upsertContact,
    }),
    [
      notes,
      tasks,
      contacts,
      projects,
      resolve,
      upsertNote,
      upsertTask,
      upsertContact,
    ],
  );

  return (
    <EntityCacheContext.Provider value={value}>
      {children}
    </EntityCacheContext.Provider>
  );
}

export function useEntityCache(): EntityCacheValue {
  const ctx = useContext(EntityCacheContext);
  if (!ctx) {
    throw new Error("useEntityCache must be used within provider");
  }
  return ctx;
}

export function useOptionalEntityCache(): EntityCacheValue | null {
  return useContext(EntityCacheContext);
}
