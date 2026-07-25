import type { EntityLinkKind, EntityLinkTarget } from "@helvety-cloud/api-contract";

import type { TaskBodyDoc } from "@/lib/vault/task-plaintext";

/** Walk a TipTap doc and collect unique entityRef attrs. */
export function extractEntityRefsFromDoc(
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
      const kind = n.attrs.kind as EntityLinkKind;
      if (
        kind === "note" ||
        kind === "task" ||
        kind === "contact" ||
        kind === "project"
      ) {
        const key = `${kind}:${n.attrs.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ kind, id: n.attrs.id });
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
