"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

import { EntityChip } from "@/components/app/entity-chip";
import type { EntityLinkKind } from "@helvety-cloud/api-contract";

export function EntityRefNodeView({ node }: NodeViewProps) {
  const kind = node.attrs.kind as EntityLinkKind;
  const id = node.attrs.id as string;

  return (
    <NodeViewWrapper as="span" className="inline align-baseline">
      <EntityChip kind={kind} id={id} />
    </NodeViewWrapper>
  );
}
