"use client";

import { CategorizationIconPicker } from "@/components/app/categorization-icon-picker";
import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { EntityColorPicker } from "@/components/app/entity-color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_MAX_VISIBLE_TASKS,
  MIN_MAX_VISIBLE_TASKS,
  resolveCompletionPercent,
  resolveMaxVisibleTasks,
  type CategorizationIcon,
  type CategorizationKind,
  type CategorizationOption,
} from "@/lib/client-crypto/categorizations";
import type { EntityColor } from "@/lib/client-crypto/entity-colors";

export function CategorizationOptionList({
  workspaceId,
  title,
  description,
  kind,
  options,
  showDefault,
  busy,
  onAdd,
  onRename,
  onDelete,
  onReorder,
  onSetDefault,
  onSetColor,
  onSetIcon,
  onSetMaxVisibleTasks,
  onSetCompletionPercent,
}: {
  workspaceId: string;
  title: string;
  description: string;
  kind: CategorizationKind;
  options: CategorizationOption[];
  showDefault: boolean;
  busy: boolean;
  onAdd: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (id: string, direction: "up" | "down") => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
  onSetColor?: (id: string, color: EntityColor | undefined) => Promise<void>;
  onSetIcon?: (
    id: string,
    icon: CategorizationIcon | undefined,
  ) => Promise<void>;
  onSetMaxVisibleTasks?: (id: string, maxVisibleTasks: number) => Promise<void>;
  onSetCompletionPercent?: (
    id: string,
    completionPercent: number,
  ) => Promise<void>;
}) {
  const sorted = [...options].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  const canDelete = kind === "labels" || sorted.length > 1;
  const singular = title.toLowerCase().replace(/s$/, "");
  const showsStageControls = !!onSetMaxVisibleTasks || !!onSetCompletionPercent;
  const colorHelpText =
    kind === "stages"
      ? "Auto uses the default stage color. Choose one to override it."
      : "Optional accent for pickers and task chips.";

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Changes save automatically when you finish editing a field or pick an
          option.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {sorted.map((opt, index) => (
          <li
            key={opt.id}
            className="flex flex-col gap-4 rounded-xl border border-border/70 bg-background px-4 py-4"
          >
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {singular} {index + 1}
              </p>
              <Input
                defaultValue={opt.name}
                disabled={busy}
                className="min-w-[12rem] flex-1"
                aria-label={`${title} name`}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== opt.name) {
                    void onRename(opt.id, next);
                  } else {
                    e.target.value = opt.name;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
            </div>
            <div
              className={[
                "grid gap-3",
                showsStageControls
                  ? "sm:grid-cols-2 xl:grid-cols-4"
                  : "sm:grid-cols-2",
              ].join(" ")}
            >
              {onSetIcon ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-foreground">
                    Icon
                  </span>
                  <CategorizationIconPicker
                    compact
                    value={opt.icon}
                    disabled={busy}
                    onChange={(icon) => void onSetIcon(opt.id, icon)}
                  />
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    Optional visual marker in pickers and task chips.
                  </p>
                </div>
              ) : null}
              {onSetColor ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-foreground">
                    Color
                  </span>
                  <EntityColorPicker
                    compact
                    value={opt.color}
                    disabled={busy}
                    onChange={(color) => void onSetColor(opt.id, color)}
                  />
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    {colorHelpText}
                  </p>
                </div>
              ) : null}
              {onSetMaxVisibleTasks ? (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`${kind}-${opt.id}-max-visible`}
                    className="text-xs font-medium text-foreground"
                  >
                    Tasks shown before “Show more”
                  </label>
                  <Input
                    id={`${kind}-${opt.id}-max-visible`}
                    type="number"
                    inputMode="numeric"
                    min={MIN_MAX_VISIBLE_TASKS}
                    max={MAX_MAX_VISIBLE_TASKS}
                    defaultValue={resolveMaxVisibleTasks(opt)}
                    disabled={busy}
                    className="h-9 w-28 tabular-nums"
                    aria-label={`Max visible tasks for ${opt.name}`}
                    onBlur={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      const current = resolveMaxVisibleTasks(opt);
                      if (
                        !Number.isInteger(parsed) ||
                        parsed < MIN_MAX_VISIBLE_TASKS ||
                        parsed > MAX_MAX_VISIBLE_TASKS
                      ) {
                        e.target.value = String(current);
                        return;
                      }
                      if (parsed !== current) {
                        void onSetMaxVisibleTasks(opt.id, parsed);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    Only affects the board view. Tasks stay in the stage either
                    way.
                  </p>
                </div>
              ) : null}
              {onSetCompletionPercent ? (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`${kind}-${opt.id}-completion`}
                    className="text-xs font-medium text-foreground"
                  >
                    Progress weight (%)
                  </label>
                  <Input
                    id={`${kind}-${opt.id}-completion`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    defaultValue={resolveCompletionPercent(opt, options)}
                    disabled={busy}
                    className="h-9 w-24 tabular-nums"
                    aria-label={`Completion percent for ${opt.name}`}
                    onBlur={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      const current = resolveCompletionPercent(opt, options);
                      if (
                        !Number.isInteger(parsed) ||
                        parsed < 0 ||
                        parsed > 100
                      ) {
                        e.target.value = String(current);
                        return;
                      }
                      if (parsed !== current) {
                        void onSetCompletionPercent(opt.id, parsed);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    Used in project completion. Cancelled stages should stay at
                    0.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              {showDefault ? (
                <Button
                  type="button"
                  size="sm"
                  variant={opt.isDefault ? "secondary" : "ghost"}
                  disabled={busy || !!opt.isDefault}
                  onClick={() => void onSetDefault?.(opt.id)}
                >
                  {opt.isDefault ? "Default" : "Set default"}
                </Button>
              ) : null}
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || index === 0}
                  onClick={() => void onReorder(opt.id, "up")}
                  aria-label="Move up"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || index === sorted.length - 1}
                  onClick={() => void onReorder(opt.id, "down")}
                  aria-label="Move down"
                >
                  ↓
                </Button>
                <DeleteButton
                  label="Remove"
                  confirmLabel="Remove"
                  busyLabel="Removing…"
                  dialogTitle={`Remove ${singular} “${opt.name}”?`}
                  dialogDescription={`This removes the ${singular}. Tasks using it will be reassigned. This cannot be undone.`}
                  disabled={busy || !canDelete}
                  busy={busy}
                  onConfirm={() => onDelete(opt.id)}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <CreateEntityDialog
        workspaceId={workspaceId}
        triggerLabel={`Add ${singular}`}
        dialogTitle={`Add ${singular}`}
        fieldLabel="Name"
        fieldPlaceholder={`Add ${singular}`}
        fieldMaxLength={80}
        confirmLabel="Add"
        disabled={busy}
        onCreate={onAdd}
      />
    </section>
  );
}
