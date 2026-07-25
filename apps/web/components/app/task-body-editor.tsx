"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Button } from "@/components/ui/button";
import type { TaskBodyDoc } from "@/lib/vault/task-plaintext";
import { cn } from "@/lib/utils";

type TaskBodyEditorProps = {
  content: TaskBodyDoc;
  onChange: (doc: TaskBodyDoc) => void;
  disabled?: boolean;
  className?: string;
};

export function TaskBodyEditor({
  content,
  onChange,
  disabled = false,
  className,
}: TaskBodyEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
    ],
    content,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[240px] px-2.5 py-2 text-sm outline-none",
          "prose prose-sm max-w-none dark:prose-invert",
          "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold",
          "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold",
          "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_p]:my-1",
        ),
        "aria-label": "Body",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON() as TaskBodyDoc);
    },
  });

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
      </div>
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
