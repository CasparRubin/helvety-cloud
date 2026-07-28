"use client";

import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { EntityLinkKind } from "@helvety-cloud/api-contract";

import { EntityChip } from "@/components/app/entity-chip";
import { useEntityCache } from "@/components/unlock/entity-cache";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { setContactProjectIds } from "@/lib/client-crypto/contacts";
import { setNoteProjectIds } from "@/lib/client-crypto/notes";
import { listEntityLinks } from "@/lib/api/v1-client";

type BacklinksPanelProps = {
  workspaceId: string;
  kind: EntityLinkKind;
  id: string;
};

type LinkedRef = {
  kind: EntityLinkKind;
  id: string;
};

async function loadLinkedRefs(
  workspaceId: string,
  kind: EntityLinkKind,
  id: string,
): Promise<LinkedRef[]> {
  const [incoming, outgoing] = await Promise.all([
    listEntityLinks(workspaceId, {
      targetKind: kind,
      targetId: id,
    }),
    listEntityLinks(workspaceId, {
      sourceKind: kind,
      sourceId: id,
    }),
  ]);
  const next: LinkedRef[] = [];
  const seen = new Set<string>();
  for (const link of incoming.links) {
    const key = `${link.sourceKind}:${link.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({ kind: link.sourceKind, id: link.sourceId });
  }
  for (const link of outgoing.links) {
    const key = `${link.targetKind}:${link.targetId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({ kind: link.targetKind, id: link.targetId });
  }
  return next;
}

export function BacklinksPanel({ workspaceId, kind, id }: BacklinksPanelProps) {
  const cache = useEntityCache();
  const [links, setLinks] = useState<LinkedRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const manageProjects = kind === "note" || kind === "contact";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const next = await loadLinkedRefs(workspaceId, kind, id);
        if (!cancelled) setLinks(next);
      } catch {
        if (!cancelled) setLinks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, kind, id]);

  const projectIds = links.filter((l) => l.kind === "project").map((l) => l.id);

  function openProjectDialog() {
    setDraftProjectIds(projectIds);
    setDialogOpen(true);
  }

  async function persistProjectIds(nextIds: string[]) {
    setSaving(true);
    try {
      if (kind === "note") {
        const row = await setNoteProjectIds(workspaceId, id, nextIds);
        const cached = cache.notes.find((n) => n.id === id);
        if (cached) cache.upsertNote({ ...cached, links: row.links });
      } else if (kind === "contact") {
        const row = await setContactProjectIds(workspaceId, id, nextIds);
        const cached = cache.contacts.find((c) => c.id === id);
        if (cached) cache.upsertContact({ ...cached, links: row.links });
      }
      setLinks(await loadLinkedRefs(workspaceId, kind, id));
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Linked</h2>
          {manageProjects ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              disabled={loading || saving}
              onClick={openProjectDialog}
            >
              Link project
            </Button>
          ) : null}
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : links.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No linked entities yet.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {links.map((link) => (
              <li
                key={`${link.kind}:${link.id}`}
                className="inline-flex items-center gap-0.5"
              >
                <EntityChip kind={link.kind} id={link.id} />
                {manageProjects && link.kind === "project" ? (
                  <button
                    type="button"
                    className="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Unlink project"
                    disabled={saving}
                    onClick={() =>
                      void persistProjectIds(
                        projectIds.filter((pid) => pid !== link.id),
                      )
                    }
                  >
                    <XIcon className="size-3" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {manageProjects ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Link projects</DialogTitle>
              </DialogHeader>
              {cache.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No projects in this workspace yet.
                </p>
              ) : (
                <ul className="flex max-h-60 flex-col gap-2 overflow-auto">
                  {cache.projects.map((p) => {
                    const checked = draftProjectIds.includes(p.id);
                    return (
                      <li key={p.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`link-project-${p.id}`}
                          checked={checked}
                          onCheckedChange={(value) => {
                            setDraftProjectIds((prev) => {
                              if (value === true) {
                                return prev.includes(p.id)
                                  ? prev
                                  : [...prev, p.id];
                              }
                              return prev.filter((pid) => pid !== p.id);
                            });
                          }}
                        />
                        <Label
                          htmlFor={`link-project-${p.id}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {p.name}
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || cache.projects.length === 0}
                  onClick={() => void persistProjectIds(draftProjectIds)}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </CardContent>
    </Card>
  );
}
