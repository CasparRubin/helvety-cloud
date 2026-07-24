"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import { getProject } from "@/lib/api/v1-client";
import {
  createIssue,
  loadDecryptedIssues,
  type DecryptedIssue,
} from "@/lib/vault/issues";
import { decryptProjectName } from "@/lib/vault/projects";

type IssueListProps = {
  workspaceId: string;
  projectId: string;
};

export function IssueList({ workspaceId, projectId }: IssueListProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [projectName, setProjectName] = useState<string>("Project");
  const [issues, setIssues] = useState<DecryptedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const [projectRow, issuesPage] = await Promise.all([
          getProject(workspaceId, projectId),
          loadDecryptedIssues(workspaceId, projectId, key),
        ]);
        if (cancelled) return;
        let name = "Untitled project";
        try {
          name = await decryptProjectName(
            key,
            projectId,
            projectRow.encryptedBlob,
          );
        } catch {
          name = "Unable to decrypt";
        }
        setProjectName(name);
        setIssues(issuesPage.issues);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load issues");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, projectId, getWorkspaceKey]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        issues.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1;
      const created = await createIssue(
        workspaceId,
        projectId,
        key,
        { title: trimmed },
        nextOrder,
      );
      setTitle("");
      router.push(`/app/w/${workspaceId}/p/${projectId}/i/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setBusy(false);
    }
  }

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <Link
          href={`/app/w/${workspaceId}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Projects
        </Link>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">
          {projectName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Issue titles and bodies are encrypted end-to-end.
        </p>
      </div>

      <form onSubmit={(e) => void onCreate(e)} className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New issue title"
          disabled={busy}
          maxLength={500}
          aria-label="Issue title"
        />
        <Button type="submit" disabled={busy || !title.trim()} size="sm">
          Create
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading issues…</p>
      ) : issues.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          No issues yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {issues.map((issue) => (
            <li key={issue.id}>
              <Link
                href={`/app/w/${workspaceId}/p/${projectId}/i/${issue.id}`}
                className="block rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40"
              >
                {issue.title || "Untitled"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
