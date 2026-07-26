import {
  entityLinkKindSchema,
  isAllowedLinkPair,
  type EntityLinkKind,
  type EntityLinkTarget,
} from "@helvety-cloud/api-contract";

import type { TaskBodyDoc } from "@/lib/client-crypto/task-plaintext";

/** Walk a TipTap doc and collect unique allowed entityRef attrs. */
export function extractEntityRefsFromDoc(
  sourceKind: EntityLinkKind,
  doc: TaskBodyDoc | unknown,
): EntityLinkTarget[] {
  const seen = new Set<string>();
  const out: EntityLinkTarget[] = [];

  function walk(node: unknown): void {
    if (typeof node !== "object" || node === null) return;
    const n = node as {
      type?: unknown;
      attrs?: { kind?: unknown; id?: unknown };
      content?: unknown[];
    };
    if (
      n.type === "entityRef" &&
      typeof n.attrs?.kind === "string" &&
      typeof n.attrs?.id === "string"
    ) {
      const kindParsed = entityLinkKindSchema.safeParse(n.attrs.kind);
      if (kindParsed.success && isAllowedLinkPair(sourceKind, kindParsed.data)) {
        const key = `${kindParsed.data}:${n.attrs.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ kind: kindParsed.data, id: n.attrs.id });
        }
      }
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child);
    }
  }

  walk(doc);
  return out;
}

/** Walk a TipTap doc and collect unique fileAttachment ids. */
export function extractFileAttachmentIdsFromDoc(
  doc: TaskBodyDoc | unknown,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  function walk(node: unknown): void {
    if (typeof node !== "object" || node === null) return;
    const n = node as {
      type?: unknown;
      attrs?: { id?: unknown };
      content?: unknown[];
    };
    if (n.type === "fileAttachment" && typeof n.attrs?.id === "string") {
      if (!seen.has(n.attrs.id)) {
        seen.add(n.attrs.id);
        out.push(n.attrs.id);
      }
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child);
    }
  }

  walk(doc);
  return out;
}
