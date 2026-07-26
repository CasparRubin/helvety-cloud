"use client";

import { useId, useState, type ReactNode } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type CreateEntityDialogProps = {
  triggerLabel: string;
  dialogTitle: string;
  fieldLabel: string;
  fieldPlaceholder?: string;
  fieldMaxLength?: number;
  fieldType?: "text" | "email";
  confirmLabel?: string;
  disabled?: boolean;
  onCreate: (value: string) => Promise<void>;
  /** Called when the dialog opens or closes so parents can reset extra fields. */
  onOpenChange?: (open: boolean) => void;
  /** Field rendered beside the primary input in a 2-col grid. */
  companion?: ReactNode;
  children?: ReactNode;
};

export function CreateEntityDialog({
  triggerLabel,
  dialogTitle,
  fieldLabel,
  fieldPlaceholder,
  fieldMaxLength = 120,
  fieldType = "text",
  confirmLabel = "Create",
  disabled = false,
  onCreate,
  onOpenChange,
  companion,
  children,
}: CreateEntityDialogProps) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasExtras = children != null || companion != null;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setValue("");
      setError(null);
    }
    onOpenChange?.(next);
  }

  async function handleCreate() {
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    try {
      await onCreate(trimmed);
      setOpen(false);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  const primaryField = (
    <div className="flex flex-col gap-2">
      <Label htmlFor={fieldId} required>
        {fieldLabel}
      </Label>
      <Input
        id={fieldId}
        type={fieldType}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={fieldPlaceholder}
        maxLength={fieldMaxLength}
        disabled={pending}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !hasExtras) void handleCreate();
        }}
      />
    </div>
  );

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        disabled={disabled || pending}
        onClick={() => handleOpenChange(true)}
        aria-label={triggerLabel}
      >
        <PlusIcon />
        <span className="hidden sm:inline">{triggerLabel}</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className={hasExtras ? "sm:max-w-lg" : undefined}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {companion != null ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {primaryField}
                {companion}
              </div>
            ) : (
              primaryField
            )}
            {children}
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !value.trim()}
              onClick={() => void handleCreate()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
