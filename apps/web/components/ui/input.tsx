import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  variant?: "default" | "seamless";
};

function Input({ className, type, variant = "default", ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        type === "date" &&
          "max-w-full [&::-webkit-datetime-edit]:min-w-0 [&::-webkit-datetime-edit]:max-w-full",
        variant === "default" &&
          "border border-input bg-transparent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        variant === "seamless" &&
          "border border-transparent bg-transparent hover:bg-muted/40 focus:bg-muted/40 focus-visible:ring-0 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
