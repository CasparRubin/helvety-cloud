"use client";

import { LayoutGridIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BOARD_STENCIL_CATEGORIES,
  BOARD_STENCIL_CATEGORY_LABELS,
  BOARD_STENCIL_ICON_COMPONENTS,
  filterBoardStencils,
  type BoardStencil,
  type BoardStencilCategory,
} from "@/lib/client-crypto/board-stencils";
import { cn } from "@/lib/utils";

type BoardStencilLibraryProps = {
  onSelect: (stencil: BoardStencil) => void;
};

export function BoardStencilLibrary({ onSelect }: BoardStencilLibraryProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BoardStencilCategory | "all">(
    "all",
  );

  const items = filterBoardStencils(query, category);
  const grouped = BOARD_STENCIL_CATEGORIES.flatMap((cat) => {
    const catItems = items.filter((s) => s.category === cat);
    if (catItems.length === 0) return [];
    return [
      {
        category: cat,
        label: BOARD_STENCIL_CATEGORY_LABELS[cat],
        items: catItems,
      },
    ];
  });

  function resetAndClose() {
    setOpen(false);
    setQuery("");
    setCategory("all");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setCategory("all");
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto h-7 gap-1 px-2 text-xs shadow-sm"
            title="Place infra and diagram elements from the stencil library."
          />
        }
      >
        <LayoutGridIcon className="size-3.5" />
        Library
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[min(100vw-2rem,22rem)] gap-0 p-0"
      >
        <div className="border-b p-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search library…"
            className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            autoFocus
          />
          <div className="mt-2 flex flex-wrap gap-1">
            <CategoryChip
              label="All"
              active={category === "all"}
              onClick={() => setCategory("all")}
            />
            {BOARD_STENCIL_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                label={BOARD_STENCIL_CATEGORY_LABELS[cat]}
                active={category === cat}
                onClick={() => setCategory(cat)}
              />
            ))}
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {grouped.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              No matching stencils.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {grouped.map((group) => (
                <div key={group.category}>
                  <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {group.items.map((stencil) => {
                      const Icon = BOARD_STENCIL_ICON_COMPONENTS[stencil.icon];
                      return (
                        <button
                          key={stencil.id}
                          type="button"
                          className="flex flex-col items-center gap-1 rounded-md border border-transparent px-1.5 py-2 text-center hover:border-border hover:bg-muted/60"
                          onClick={() => {
                            onSelect(stencil);
                            resetAndClose();
                          }}
                        >
                          <Icon
                            className="size-5 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="line-clamp-2 text-[10px] leading-tight">
                            {stencil.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px]",
        active
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-muted/70",
      )}
    >
      {label}
    </button>
  );
}
