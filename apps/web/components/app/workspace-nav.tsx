"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeftIcon, SlashIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import {
  isInAppWorkspacePath,
  type NavBackMode,
} from "@/lib/app-nav-path";

export {
  isInAppWorkspacePath,
  parentHrefFor,
  parseAppNavPath,
  resolveNavBackMode,
  type AppNavEntity,
  type AppNavLocation,
  type NavBackMode,
} from "@/lib/app-nav-path";

export function NavSeparator() {
  return (
    <SlashIcon
      role="presentation"
      aria-hidden="true"
      className="size-3.5 shrink-0 text-muted-foreground/50"
    />
  );
}

/**
 * Tracks in-app pathnames so Back can use `router.back()` when the user
 * arrived via an in-app navigation (e.g. note → task), not only logical parent.
 */
export function useInAppNavHistory(pathname: string): {
  hasInAppPredecessor: boolean;
  noteParentReplace: (href: string) => void;
} {
  const stackRef = useRef<string[]>([]);
  const [hasInAppPredecessor, setHasInAppPredecessor] = useState(false);

  useLayoutEffect(() => {
    if (!pathname.startsWith("/app")) return;

    const stack = stackRef.current;
    const last = stack[stack.length - 1];
    if (last === pathname) {
      setHasInAppPredecessor(
        stack.length >= 2 && isInAppWorkspacePath(stack[stack.length - 2]!),
      );
      return;
    }

    // Browser / router.back(): new path matches the previous stack entry.
    if (stack.length >= 2 && stack[stack.length - 2] === pathname) {
      stack.pop();
    } else {
      stack.push(pathname);
      if (stack.length > 50) stack.shift();
    }

    setHasInAppPredecessor(
      stack.length >= 2 && isInAppWorkspacePath(stack[stack.length - 2]!),
    );
  }, [pathname]);

  const noteParentReplace = useCallback((href: string) => {
    const stack = stackRef.current;
    if (stack.length > 0) {
      stack[stack.length - 1] = href;
    } else {
      stack.push(href);
    }
    setHasInAppPredecessor(
      stack.length >= 2 && isInAppWorkspacePath(stack[stack.length - 2]!),
    );
  }, []);

  return { hasInAppPredecessor, noteParentReplace };
}

type NavBackButtonProps = {
  mode: NavBackMode;
  parentHref: string | null;
  onParentNavigate?: (href: string) => void;
};

export function NavBackButton({
  mode,
  parentHref,
  onParentNavigate,
}: NavBackButtonProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const disabled = mode === "none";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      title={t("back")}
      disabled={disabled}
      onClick={() => {
        if (mode === "history") {
          router.back();
          return;
        }
        if (mode === "parent" && parentHref) {
          onParentNavigate?.(parentHref);
          router.replace(parentHref);
        }
      }}
    >
      <ChevronLeftIcon />
      {t("back")}
    </Button>
  );
}
