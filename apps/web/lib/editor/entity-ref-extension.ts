import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { EntityRefNodeView } from "@/components/app/entity-ref-node-view";

export type EntityRefAttrs = {
  kind: "task" | "contact" | "note" | "project";
  id: string;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    entityRef: {
      insertEntityRef: (attrs: EntityRefAttrs) => ReturnType;
    };
  }
}

export const EntityRef = Node.create({
  name: "entityRef",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      kind: {
        default: "task",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-kind"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-kind": attributes.kind as string,
        }),
      },
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-id"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-id": attributes.id as string,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="entity-ref"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          "data-type": "entity-ref",
          "data-kind": node.attrs.kind,
          "data-id": node.attrs.id,
        },
        HTMLAttributes,
      ),
      `[@${node.attrs.kind}]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EntityRefNodeView);
  },

  addCommands() {
    return {
      insertEntityRef:
        (attrs: EntityRefAttrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
