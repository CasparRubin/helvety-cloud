"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  addCategorizationOption,
  copyProjectCategorizations,
  deleteCategorizationOption,
  renameCategorizationOption,
  reorderCategorizationOption,
  setCategorizationDefault,
  setCategorizationOptionColor,
  setCategorizationOptionIcon,
  setCategorizationOptionMaxVisibleTasks,
  setCategorizationOptionCompletionPercent,
} from "@/lib/vault/categorization-ops";
import type {
  CategorizationIcon,
  CategorizationKind,
} from "@/lib/vault/categorizations";
import type { EntityColor } from "@/lib/vault/entity-colors";
import {
  deleteProject,
  loadDecryptedProject,
  loadDecryptedProjects,
  renameProject,
  saveProjectContent,
  projectPlaintextFrom,
  type DecryptedProject,
} from "@/lib/vault/projects";

type ProjectSettingsContextValue = {
  project: DecryptedProject | null;
  siblings: DecryptedProject[];
  loading: boolean;
  error: string | null;
  busy: boolean;
  nameDraft: string;
  setNameDraft: (value: string) => void;
  copyFromId: string;
  setCopyFromId: (value: string) => void;
  onRename: (e: React.FormEvent) => Promise<void>;
  onCopy: (e: React.FormEvent) => Promise<void>;
  onDeleteProject: () => Promise<void>;
  onSetColor: (color: EntityColor | undefined) => Promise<void>;
  onAddOption: (kind: CategorizationKind, name: string) => Promise<void>;
  onRenameOption: (
    kind: CategorizationKind,
    id: string,
    name: string,
  ) => Promise<void>;
  onDeleteOption: (kind: CategorizationKind, id: string) => Promise<void>;
  onReorderOption: (
    kind: CategorizationKind,
    id: string,
    direction: "up" | "down",
  ) => Promise<void>;
  onSetDefault: (
    kind: "stages" | "priorities",
    id: string,
  ) => Promise<void>;
  onSetOptionColor: (
    id: string,
    color: EntityColor | undefined,
  ) => Promise<void>;
  onSetOptionIcon: (
    kind: CategorizationKind,
    id: string,
    icon: CategorizationIcon | undefined,
  ) => Promise<void>;
  onSetMaxVisibleTasks: (id: string, maxVisibleTasks: number) => Promise<void>;
  onSetCompletionPercent: (
    id: string,
    completionPercent: number,
  ) => Promise<void>;
  ensureSiblingsLoaded: () => Promise<void>;
};

const ProjectSettingsContext =
  createContext<ProjectSettingsContextValue | null>(null);

export function ProjectSettingsProvider({
  workspaceId,
  projectId,
  children,
}: {
  workspaceId: string;
  projectId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [project, setProject] = useState<DecryptedProject | null>(null);
  const [siblings, setSiblings] = useState<DecryptedProject[]>([]);
  const [siblingsLoaded, setSiblingsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [copyFromId, setCopyFromId] = useState("");

  const reload = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    const loaded = await loadDecryptedProject(workspaceId, projectId, key);
    setProject(loaded);
    setNameDraft(loaded.name);
  }, [getWorkspaceKey, workspaceId, projectId]);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        await reload();
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load project");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, reload]);

  const ensureSiblingsLoaded = useCallback(async () => {
    if (siblingsLoaded) return;
    try {
      const key = await getWorkspaceKey(workspaceId);
      const page = await loadDecryptedProjects(workspaceId, key);
      setSiblings(page.projects.filter((p) => p.id !== projectId));
      setSiblingsLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    }
  }, [siblingsLoaded, getWorkspaceKey, workspaceId, projectId]);

  async function withBusy(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRename(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === project.name) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      const saved = await renameProject(workspaceId, key, project, trimmed);
      setProject(saved);
      setNameDraft(saved.name);
      window.dispatchEvent(new Event("helvety:projects-changed"));
    });
  }

  async function onCopy(e: React.FormEvent) {
    e.preventDefault();
    if (!copyFromId) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      const saved = await copyProjectCategorizations(
        workspaceId,
        key,
        copyFromId,
        projectId,
      );
      setProject(saved);
      setCopyFromId("");
    });
  }

  async function onDeleteProject() {
    if (busy || !project) return;
    setBusy(true);
    setError(null);
    try {
      await deleteProject(workspaceId, project);
      window.dispatchEvent(new Event("helvety:projects-changed"));
      router.push(`/app/w/${workspaceId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  }

  async function onSetColor(color: EntityColor | undefined) {
    if (!project) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveProjectContent(
        workspaceId,
        key,
        project,
        projectPlaintextFrom(
          project,
          color ? { color } : { clearColor: true },
        ),
      );
      setProject(saved);
    });
  }

  async function onAddOption(kind: CategorizationKind, name: string) {
    if (!project) throw new Error("Project not loaded");
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      setProject(
        await addCategorizationOption(
          workspaceId,
          key,
          project,
          kind,
          name,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onRenameOption(
    kind: CategorizationKind,
    id: string,
    name: string,
  ) {
    if (!project) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      setProject(
        await renameCategorizationOption(
          workspaceId,
          key,
          project,
          kind,
          id,
          name,
        ),
      );
    });
  }

  async function onDeleteOption(kind: CategorizationKind, id: string) {
    if (!project) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      setProject(
        await deleteCategorizationOption(
          workspaceId,
          key,
          project,
          kind,
          id,
        ),
      );
    });
  }

  async function onReorderOption(
    kind: CategorizationKind,
    id: string,
    direction: "up" | "down",
  ) {
    if (!project) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      setProject(
        await reorderCategorizationOption(
          workspaceId,
          key,
          project,
          kind,
          id,
          direction,
        ),
      );
    });
  }

  async function onSetDefault(kind: "stages" | "priorities", id: string) {
    if (!project) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      setProject(
        await setCategorizationDefault(
          workspaceId,
          key,
          project,
          kind,
          id,
        ),
      );
    });
  }

  async function onSetOptionColor(
    id: string,
    color: EntityColor | undefined,
  ) {
    if (!project) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      setProject(
        await setCategorizationOptionColor(
          workspaceId,
          key,
          project,
          "stages",
          id,
          color ?? null,
        ),
      );
    });
  }

  async function onSetOptionIcon(
    kind: CategorizationKind,
    id: string,
    icon: CategorizationIcon | undefined,
  ) {
    if (!project) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      setProject(
        await setCategorizationOptionIcon(
          workspaceId,
          key,
          project,
          kind,
          id,
          icon ?? null,
        ),
      );
    });
  }

  async function onSetMaxVisibleTasks(id: string, maxVisibleTasks: number) {
    if (!project) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      setProject(
        await setCategorizationOptionMaxVisibleTasks(
          workspaceId,
          key,
          project,
          id,
          maxVisibleTasks,
        ),
      );
    });
  }

  async function onSetCompletionPercent(id: string, completionPercent: number) {
    if (!project) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      setProject(
        await setCategorizationOptionCompletionPercent(
          workspaceId,
          key,
          project,
          id,
          completionPercent,
        ),
      );
    });
  }

  if (!vault) return null;

  const value: ProjectSettingsContextValue = {
    project,
    siblings,
    loading,
    error,
    busy,
    nameDraft,
    setNameDraft,
    copyFromId,
    setCopyFromId,
    onRename,
    onCopy,
    onDeleteProject,
    onSetColor,
    onAddOption,
    onRenameOption,
    onDeleteOption,
    onReorderOption,
    onSetDefault,
    onSetOptionColor,
    onSetOptionIcon,
    onSetMaxVisibleTasks,
    onSetCompletionPercent,
    ensureSiblingsLoaded,
  };

  return (
    <ProjectSettingsContext.Provider value={value}>
      {children}
    </ProjectSettingsContext.Provider>
  );
}

export function useProjectSettings(): ProjectSettingsContextValue {
  const ctx = useContext(ProjectSettingsContext);
  if (!ctx) {
    throw new Error(
      "useProjectSettings must be used within ProjectSettingsProvider",
    );
  }
  return ctx;
}
