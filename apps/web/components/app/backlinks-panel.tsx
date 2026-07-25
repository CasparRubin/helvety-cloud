"use client";

import { useEffect, useState } from "react";
import type { EntityLinkKind } from "@helvety-cloud/api-contract";

import { EntityChip } from "@/components/app/entity-chip";
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

export function BacklinksPanel({ workspaceId, kind, id }: BacklinksPanelProps) {
  const [links, setLinks] = useState<LinkedRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
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
        if (cancelled) return;
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
        setLinks(next);
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

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-3">
        <h2 className="text-sm font-medium">Linked</h2>
        <p className="mt-1 text-xs text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="rounded-lg border border-border p-3">
        <h2 className="text-sm font-medium">Linked</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          No linked entities yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <h2 className="text-sm font-medium">Linked</h2>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {links.map((link) => (
          <li key={`${link.kind}:${link.id}`}>
            <EntityChip kind={link.kind} id={link.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
