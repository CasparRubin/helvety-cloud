"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete permanently",
  busyLabel = "Deleting…",
  busy = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const pending = busy || confirming;

  async function handleConfirm() {
    if (pending) return;
    setConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {pending ? busyLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type DeleteButtonProps = {
  label?: string;
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel?: string;
  busyLabel?: string;
  disabled?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  variant?: React.ComponentProps<typeof Button>["variant"];
};

/** Destructive delete button that opens ConfirmDeleteDialog. */
export function DeleteButton({
  label = "Delete",
  dialogTitle,
  dialogDescription,
  confirmLabel,
  busyLabel,
  disabled,
  busy,
  onConfirm,
  variant = "destructive",
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled={disabled || busy}
        onClick={() => setOpen(true)}
      >
        <Trash2Icon />
        {label}
      </Button>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={confirmLabel}
        busyLabel={busyLabel}
        busy={busy}
        onConfirm={onConfirm}
      />
    </>
  );
}
