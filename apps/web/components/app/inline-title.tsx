"use client";

import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InlineTitleProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "rows" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function InlineTitle({
  value,
  onChange,
  onKeyDown,
  className,
  placeholder = "Untitled",
  disabled,
  maxLength,
  "aria-label": ariaLabel = "Title",
  ...rest
}: InlineTitleProps) {
  return (
    <div
      className={cn(
        "grid w-full after:invisible after:whitespace-pre-wrap after:content-[attr(data-value)] after:[grid-area:1/1/2/2]",
        "text-2xl font-semibold tracking-tight after:break-words",
        "after:px-1.5 after:py-1",
        className,
      )}
      data-value={value || " "}
    >
      <textarea
        {...rest}
        rows={1}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "w-full resize-none overflow-hidden rounded-md border-0 bg-transparent px-1.5 py-1",
          "break-words font-[inherit] text-[length:inherit] leading-[inherit] tracking-[inherit]",
          "outline-none transition-colors placeholder:text-muted-foreground/60",
          "hover:bg-muted/40 focus-visible:bg-muted/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[grid-area:1/1/2/2]",
        )}
      />
    </div>
  );
}
