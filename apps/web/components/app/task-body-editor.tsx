"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import type { EntityLinkKind, EntityLinkTarget } from "@helvety-cloud/api-contract";
import { Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api/v1-client";
import { EntityRef } from "@/lib/editor/entity-ref-extension";
import { FileAttachment } from "@/lib/editor/file-attachment-extension";
import { uploadVaultAttachment } from "@/lib/vault/attachments";
import type { TaskBodyDoc } from "@/lib/vault/task-plaintext";
import { cn } from "@/lib/utils";

export type EntityLinkAction =
  | { type: "create-task"; title: string }
  | { type: "create-contact"; displayName: string }
  | { type: "link-existing"; target: EntityLinkTarget };

type FileAttachmentsConfig = {
  workspaceId: string;
  getWorkspaceKey: () => Promise<Uint8Array>;
  onStorageLimit?: (message: string) => void;
};

type TaskBodyEditorProps = {
  content: TaskBodyDoc;
  onChange: (doc: TaskBodyDoc) => void;
  disabled?: boolean;
  className?: string;
  /** Shorter editor for project/milestone descriptions. */
  compact?: boolean;
  enableEntityLinks?: boolean;
  linkCandidates?: {
    kind: EntityLinkKind;
    id: string;
    label: string;
  }[];
  onEntityLinkAction?: (
    action: EntityLinkAction,
  ) => Promise<EntityLinkTarget | void> | EntityLinkTarget | void;
  /** When set, enables TipTap fileAttachment upload/paste/drop. */
  fileAttachments?: FileAttachmentsConfig;
};

export function TaskBodyEditor({
  content,
  onChange,
  disabled = false,
  className,
  compact = false,
  enableEntityLinks = false,
  linkCandidates = [],
  onEntityLinkAction,
  fileAttachments,
}: TaskBodyEditorProps) {
  const [linkQuery, setLinkQuery] = useState("");
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileAttachmentsRef = useRef<FileAttachmentsConfig | undefined>(
    fileAttachments,
  );
  const uploadingRef = useRef(false);
  const uploadFilesRef = useRef<(files: File[]) => Promise<void>>(
    async () => {},
  );

  useEffect(() => {
    fileAttachmentsRef.current = fileAttachments;
  }, [fileAttachments]);

  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      ...(enableEntityLinks ? [EntityRef] : []),
      ...(fileAttachments
        ? [
            FileAttachment.configure({
              workspaceId: fileAttachments.workspaceId,
              getWorkspaceKey: fileAttachments.getWorkspaceKey,
              onStorageLimit: fileAttachments.onStorageLimit,
            }),
          ]
        : []),
    ],
    content,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          compact ? "min-h-[96px]" : "min-h-[240px]",
          "px-2.5 py-2 text-sm outline-none",
          "prose prose-sm max-w-none dark:prose-invert",
          "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold",
          "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold",
          "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_p]:my-1",
        ),
        "aria-label": "Body",
      },
      handlePaste: (_view, event) => {
        if (!fileAttachmentsRef.current || disabled) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        const files: File[] = [];
        for (const item of items) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
        if (files.length === 0) return false;
        event.preventDefault();
        void uploadFilesRef.current(files);
        return true;
      },
      handleDrop: (_view, event) => {
        if (!fileAttachmentsRef.current || disabled) return false;
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        event.preventDefault();
        void uploadFilesRef.current(Array.from(files));
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON() as TaskBodyDoc);
    },
  });

  useEffect(() => {
    uploadFilesRef.current = async (files: File[]) => {
      const cfg = fileAttachmentsRef.current;
      if (!cfg || !editor || uploadingRef.current) return;
      setUploading(true);
      try {
        for (const file of files) {
          try {
            const key = await cfg.getWorkspaceKey();
            const uploaded = await uploadVaultAttachment({
              workspaceId: cfg.workspaceId,
              workspaceKey: key,
              file,
            });
            editor
              .chain()
              .focus()
              .insertFileAttachment({ id: uploaded.id })
              .run();
          } catch (e) {
            if (e instanceof ApiClientError && e.code === "limit_exceeded") {
              cfg.onStorageLimit?.(e.message);
              break;
            }
            throw e;
          }
        }
      } finally {
        setUploading(false);
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(content);
    if (current !== next) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, content]);

  async function handleAction(action: EntityLinkAction) {
    if (!editor || !onEntityLinkAction || busy) return;
    const { from, to } = editor.state.selection;
    setBusy(true);
    try {
      const target = await onEntityLinkAction(action);
      if (target) {
        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertEntityRef(target)
          .run();
      }
      setShowLinkPicker(false);
      setLinkQuery("");
    } finally {
      setBusy(false);
    }
  }

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-[280px] rounded-lg border border-input bg-transparent",
          className,
        )}
      />
    );
  }

  const filteredCandidates = linkCandidates.filter((c) => {
    if (!linkQuery.trim()) return true;
    return c.label.toLowerCase().includes(linkQuery.trim().toLowerCase());
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-input bg-transparent",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "opacity-50",
        className,
      )}
    >
      <div className="flex flex-wrap gap-0.5 border-b border-border px-1 py-1">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Strike"
          active={editor.isActive("strike")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarButton
          label="H2"
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <ToolbarButton
          label="H3"
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />
        <ToolbarButton
          label="Bullet"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Number"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        {fileAttachments ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
            >
              <Paperclip className="size-3.5" />
              {uploading ? "Uploading…" : "Attach"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                const files = e.target.files
                  ? Array.from(e.target.files)
                  : [];
                e.target.value = "";
                if (files.length > 0) void uploadFilesRef.current(files);
              }}
            />
          </>
        ) : null}
      </div>

      {enableEntityLinks && onEntityLinkAction ? (
        <BubbleMenu
          editor={editor}
          options={{ placement: "top" }}
          shouldShow={({ editor: ed, state }) => {
            const { from, to } = state.selection;
            return !ed.isActive("entityRef") && from !== to && !disabled;
          }}
        >
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-popover p-1 shadow-md">
            <Button
              type="button"
              size="xs"
              variant="secondary"
              disabled={disabled || busy}
              onClick={() => {
                const { from, to } = editor.state.selection;
                const title = editor.state.doc.textBetween(from, to, " ").trim();
                if (!title) return;
                void handleAction({ type: "create-task", title });
              }}
            >
              Create task
            </Button>
            <Button
              type="button"
              size="xs"
              variant="secondary"
              disabled={disabled || busy}
              onClick={() => {
                const { from, to } = editor.state.selection;
                const displayName = editor.state.doc
                  .textBetween(from, to, " ")
                  .trim();
                if (!displayName) return;
                void handleAction({
                  type: "create-contact",
                  displayName,
                });
              }}
            >
              Create contact
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={disabled || busy}
              onClick={() => setShowLinkPicker((v) => !v)}
            >
              Link existing…
            </Button>
            {showLinkPicker ? (
              <div className="w-full min-w-[14rem] space-y-1 border-t border-border pt-1">
                <input
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-xs"
                  placeholder="Search…"
                  value={linkQuery}
                  onChange={(e) => setLinkQuery(e.target.value)}
                  aria-label="Search entities"
                />
                <ul className="max-h-40 overflow-auto text-xs">
                  {filteredCandidates.slice(0, 40).map((c) => (
                    <li key={`${c.kind}:${c.id}`}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left hover:bg-muted"
                        onClick={() =>
                          void handleAction({
                            type: "link-existing",
                            target: { kind: c.kind, id: c.id },
                          })
                        }
                      >
                        <span className="text-muted-foreground">{c.kind}</span>
                        <span className="truncate">{c.label}</span>
                      </button>
                    </li>
                  ))}
                  {filteredCandidates.length === 0 ? (
                    <li className="px-1.5 py-1 text-muted-foreground">
                      No matches
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        </BubbleMenu>
      ) : null}

      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="xs"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </Button>
  );
}
