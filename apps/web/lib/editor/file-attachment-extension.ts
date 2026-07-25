import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { FileAttachmentNodeView } from "@/components/app/file-attachment-node-view";

export type FileAttachmentAttrs = {
  id: string;
};

export type FileAttachmentOptions = {
  workspaceId: string;
  getWorkspaceKey: () => Promise<Uint8Array>;
  /** Called when upload is blocked by entitlements (free workspace). */
  onStorageLimit?: (message: string) => void;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fileAttachment: {
      insertFileAttachment: (attrs: FileAttachmentAttrs) => ReturnType;
    };
  }
}

export const FileAttachment = Node.create<FileAttachmentOptions>({
  name: "fileAttachment",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      workspaceId: "",
      getWorkspaceKey: async () => {
        throw new Error("FileAttachment getWorkspaceKey not configured");
      },
      onStorageLimit: undefined,
    };
  },

  addAttributes() {
    return {
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
    return [{ tag: 'div[data-type="file-attachment"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        {
          "data-type": "file-attachment",
          "data-id": node.attrs.id,
        },
        HTMLAttributes,
      ),
      `[file ${node.attrs.id}]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentNodeView);
  },

  addCommands() {
    return {
      insertFileAttachment:
        (attrs: FileAttachmentAttrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
