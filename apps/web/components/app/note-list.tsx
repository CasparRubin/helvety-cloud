"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import {
  PageActions,
  WorkspaceSettingsAction,
} from "@/components/app/page-actions";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import {
  createNote,
  loadDecryptedNotes,
  type DecryptedNote,
} from "@/lib/client-crypto/notes";
import { textToTaskBody } from "@/lib/client-crypto/task-plaintext";
import { formatDateTime } from "@/lib/format-datetime";

type NoteListProps = {
  workspaceId: string;
};

export function NoteList({ workspaceId }: NoteListProps) {
  const t = useTranslations("notes");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { userKeys, getWorkspaceKey } = useCryptoSession();

  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newBody, setNewBody] = useState("");

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const page = await loadDecryptedNotes(workspaceId, key);
        if (cancelled) return;
        setNotes(page.notes);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t("loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, workspaceId, getWorkspaceKey, t]);

  function resetCreateFields() {
    setNewBody("");
  }

  async function onCreate(title: string) {
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        notes.reduce((max, n) => Math.max(max, n.sortOrder), -1) + 1;
      const body = newBody.trim();
      const created = await createNote(
        workspaceId,
        key,
        {
          title,
          body: body ? textToTaskBody(body) : undefined,
        },
        nextOrder,
      );
      window.dispatchEvent(new Event("helvety:notes-changed"));
      router.push(`/app/w/${workspaceId}/notes/${created.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!userKeys) return null;

  return (
    <>
      <PageActions>
        <CreateEntityDialog
          triggerLabel={t("createTitle")}
          dialogTitle={t("createTitle")}
          fieldLabel={t("titleLabel")}
          fieldPlaceholder={t("namePlaceholder")}
          fieldMaxLength={500}
          disabled={busy}
          onCreate={onCreate}
          onOpenChange={(open) => {
            if (open) resetCreateFields();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-note-body">{t("bodyLabel")}</Label>
            <Textarea
              id="new-note-body"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder={t("bodyPlaceholder")}
              disabled={busy}
              rows={3}
            />
          </div>
        </CreateEntityDialog>
      </PageActions>
      <WorkspaceSettingsAction workspaceId={workspaceId} />
      <EntityListShell
        title={t("title")}
        error={error}
        loading={loading}
        loadingLabel={t("loading")}
        empty={!loading && notes.length === 0}
        emptyLabel={t("empty")}
      >
        {notes.map((note) => (
          <EntityListRow key={note.id}>
            <Link
              href={`/app/w/${workspaceId}/notes/${note.id}`}
              className="flex w-full flex-col gap-0.5"
            >
              <span className="font-medium">
                {note.title || tCommon("untitled")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("createdModified", {
                  created: formatDateTime(note.createdAt),
                  modified: formatDateTime(note.updatedAt),
                })}
              </span>
            </Link>
          </EntityListRow>
        ))}
      </EntityListShell>
    </>
  );
}
