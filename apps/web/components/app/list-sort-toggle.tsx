"use client";

import { Button } from "@/components/ui/button";

type ListSortToggleProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { id: T; label: string }[];
  disabled?: boolean;
};

export function ListSortToggle<T extends string>({
  value,
  onValueChange,
  options,
  disabled = false,
}: ListSortToggleProps<T>) {
  return (
    <div className="flex flex-wrap gap-0.5" role="group" aria-label="Sort by">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Button
            key={option.id}
            type="button"
            size="xs"
            variant={active ? "secondary" : "ghost"}
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onValueChange(option.id)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
