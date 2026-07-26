"use client";

import { CategorizationIconPicker } from "@/components/app/categorization-icon-picker";
import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
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

  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {sorted.map((opt, index) => (
          <li
            key={opt.id}
            className="flex flex-col gap-2 border-b border-border pb-3 last:border-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                defaultValue={opt.name}
                disabled={busy}
                className="min-w-[10rem] flex-1"
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
              {onSetIcon ? (
                <CategorizationIconPicker
                  compact
                  value={opt.icon}
                  disabled={busy}
                  onChange={(icon) => void onSetIcon(opt.id, icon)}
                />
              ) : null}
              {onSetColor ? (
                <EntityColorPicker
                  compact
                  value={opt.color}
                  disabled={busy}
                  onChange={(color) => void onSetColor(opt.id, color)}
                />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              {onSetMaxVisibleTasks ? (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Show</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={MIN_MAX_VISIBLE_TASKS}
                    max={MAX_MAX_VISIBLE_TASKS}
                    defaultValue={resolveMaxVisibleTasks(opt)}
                    disabled={busy}
                    className="h-8 w-16 tabular-nums"
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
                </label>
              ) : null}
              {onSetCompletionPercent ? (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>%</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    defaultValue={resolveCompletionPercent(opt, options)}
                    disabled={busy}
                    className="h-8 w-14 tabular-nums"
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
                </label>
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
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busy || !canDelete}
                  onClick={() => void onDelete(opt.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <CreateEntityDialog
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
