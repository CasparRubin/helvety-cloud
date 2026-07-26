"use client";

import { LanguageSwitcher } from "@/components/app/language-switcher";
import { ThemeToggle } from "@/components/app/theme-toggle";

export function HeaderControls() {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
  );
}
