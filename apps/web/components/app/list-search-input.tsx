"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ListSearchInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function ListSearchInput({
  value,
  onValueChange,
  placeholder = "Filter…",
  disabled = false,
}: ListSearchInputProps) {
  return (
    <div className="relative max-w-sm">
      <Input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(value ? "pr-8" : undefined)}
        aria-label={placeholder}
        autoComplete="off"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="absolute top-1/2 right-0.5 size-7 -translate-y-1/2 px-0"
          onClick={() => onValueChange("")}
          aria-label="Clear filter"
        >
          <XIcon className="size-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
