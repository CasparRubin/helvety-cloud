"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import type { EntityColor } from "@/lib/client-crypto/entity-colors";
import {
  deleteProject,
  loadDecryptedProject,
  renameProject,
  saveProjectContent,
  projectPlaintextFrom,
  type DecryptedProject,
} from "@/lib/client-crypto/projects";

type ProjectSettingsContextValue = {
  project: DecryptedProject | null;
  loading: boolean;
  error: string | null;
  busy: boolean;
  nameDraft: string;
  setNameDraft: (value: string) => void;
  onRename: (e: React.FormEvent) => Promise<void>;
  onDeleteProject: () => Promise<void>;
  onSetColor: (color: EntityColor | undefined) => Promise<void>;
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
  const { userKeys, getWorkspaceKey } = useCryptoSession();

  const [project, setProject] = useState<DecryptedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        const loaded = await loadDecryptedProject(workspaceId, projectId, key);
        if (cancelled) return;
        setProject(loaded);
        setNameDraft(loaded.name);
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
  }, [userKeys, getWorkspaceKey, workspaceId, projectId]);

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

  if (!userKeys) return null;

  const value: ProjectSettingsContextValue = {
    project,
    loading,
    error,
    busy,
    nameDraft,
    setNameDraft,
    onRename,
    onDeleteProject,
    onSetColor,
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
