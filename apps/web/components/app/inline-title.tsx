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
  onBlur,
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
        onBlur={onBlur}
        className={cn(
          "w-full resize-none overflow-hidden border-0 bg-transparent p-0",
          "break-words font-[inherit] text-[length:inherit] leading-[inherit] tracking-[inherit]",
          "outline-none placeholder:text-muted-foreground/60",
          "focus-visible:rounded-sm focus-visible:ring-1 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[grid-area:1/1/2/2]",
        )}
      />
    </div>
  );
}
