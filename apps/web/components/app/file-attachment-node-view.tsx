"use client";

import { useEffect, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Download, FileIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  downloadAndDecryptAttachment,
  isInlineImageMime,
  loadAttachmentMeta,
} from "@/lib/vault/attachments";
import type { FileAttachmentOptions } from "@/lib/editor/file-attachment-extension";
import { cn } from "@/lib/utils";

export function FileAttachmentNodeView({ node, extension }: NodeViewProps) {
  const attachmentId = node.attrs.id as string;
  const options = extension.options as FileAttachmentOptions;
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [filename, setFilename] = useState("File");
  const [mimeType, setMimeType] = useState("application/octet-stream");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setStatus("loading");
      setError(null);
      try {
        const key = await options.getWorkspaceKey();
        const meta = await loadAttachmentMeta({
          workspaceId: options.workspaceId,
          workspaceKey: key,
          attachmentId,
        });
        if (cancelled) return;
        setFilename(meta.filename);
        setMimeType(meta.mimeType);

        if (isInlineImageMime(meta.mimeType)) {
          const { bytes } = await downloadAndDecryptAttachment({
            workspaceId: options.workspaceId,
            workspaceKey: key,
            attachmentId,
          });
          if (cancelled) return;
          const blob = new Blob([bytes as BlobPart], { type: meta.mimeType });
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        }
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load file");
        setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId, options]);

  async function handleDownload() {
    try {
      const key = await options.getWorkspaceKey();
      const { meta, bytes } = await downloadAndDecryptAttachment({
        workspaceId: options.workspaceId,
        workspaceKey: key,
        attachmentId,
      });
      const blob = new Blob([bytes as BlobPart], { type: meta.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  if (status === "loading") {
    return (
      <NodeViewWrapper className="my-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading file…
      </NodeViewWrapper>
    );
  }

  if (status === "error") {
    return (
      <NodeViewWrapper className="my-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
        {error ?? "Could not decrypt file"}
      </NodeViewWrapper>
    );
  }

  if (blobUrl && isInlineImageMime(mimeType)) {
    return (
      <NodeViewWrapper className="my-3">
        {/* Decrypted blob URLs are not compatible with next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blobUrl}
          alt={filename}
          className="max-h-96 max-w-full rounded-md border border-border object-contain"
        />
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{filename}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => void handleDownload()}
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={cn(
        "my-2 flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2",
      )}
    >
      <FileIcon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{filename}</p>
        <p className="truncate text-xs text-muted-foreground">{mimeType}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleDownload()}
      >
        <Download className="size-3.5" />
        Download
      </Button>
    </NodeViewWrapper>
  );
}
