"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

type PageActionsContextValue = {
  actionsEl: HTMLElement | null;
  dangerEl: HTMLElement | null;
  settingsEl: HTMLElement | null;
  setActionsEl: (el: HTMLElement | null) => void;
  setDangerEl: (el: HTMLElement | null) => void;
  setSettingsEl: (el: HTMLElement | null) => void;
};

const PageActionsContext = createContext<PageActionsContextValue | null>(null);

export function PageActionsProvider({ children }: { children: ReactNode }) {
  const [actionsEl, setActionsElState] = useState<HTMLElement | null>(null);
  const [dangerEl, setDangerElState] = useState<HTMLElement | null>(null);
  const [settingsEl, setSettingsElState] = useState<HTMLElement | null>(null);

  const setActionsEl = useCallback((el: HTMLElement | null) => {
    setActionsElState((prev) => (prev === el ? prev : el));
  }, []);

  const setDangerEl = useCallback((el: HTMLElement | null) => {
    setDangerElState((prev) => (prev === el ? prev : el));
  }, []);

  const setSettingsEl = useCallback((el: HTMLElement | null) => {
    setSettingsElState((prev) => (prev === el ? prev : el));
  }, []);

  const value = useMemo(
    () => ({
      actionsEl,
      dangerEl,
      settingsEl,
      setActionsEl,
      setDangerEl,
      setSettingsEl,
    }),
    [
      actionsEl,
      dangerEl,
      settingsEl,
      setActionsEl,
      setDangerEl,
      setSettingsEl,
    ],
  );

  return (
    <PageActionsContext.Provider value={value}>
      {children}
    </PageActionsContext.Provider>
  );
}

function usePageActionsContext(): PageActionsContextValue {
  const ctx = useContext(PageActionsContext);
  if (!ctx) {
    throw new Error("PageActions must be used within PageActionsProvider");
  }
  return ctx;
}

/** Portals create actions into the sticky secondary bar (left, after Back). */
export function PageActions({ children }: { children: ReactNode }) {
  const { actionsEl } = usePageActionsContext();
  if (!actionsEl) return null;
  return createPortal(children, actionsEl);
}

/** Portals delete actions into the sticky secondary bar (right). */
export function PageDangerActions({ children }: { children: ReactNode }) {
  const { dangerEl } = usePageActionsContext();
  if (!dangerEl) return null;
  return createPortal(children, dangerEl);
}

/** Portals settings actions; always rendered to the right of delete actions. */
export function PageSettingsActions({ children }: { children: ReactNode }) {
  const { settingsEl } = usePageActionsContext();
  if (!settingsEl) return null;
  return createPortal(children, settingsEl);
}

export function WorkspaceSettingsAction({
  workspaceId,
}: {
  workspaceId: string;
}) {
  return (
    <PageSettingsActions>
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={`/app/w/${workspaceId}/settings/general`} />}
        nativeButton={false}
        aria-label="Workspace settings"
      >
        <SettingsIcon />
        <span className="hidden sm:inline">Workspace settings</span>
      </Button>
    </PageSettingsActions>
  );
}

export function PageActionsSlot() {
  const { setActionsEl, setDangerEl, setSettingsEl } = usePageActionsContext();
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
      <ButtonGroup ref={setActionsEl} className="shrink-0" />
      <div className="ml-auto flex shrink-0 items-stretch gap-2">
        <ButtonGroup ref={setDangerEl} />
        <ButtonGroup ref={setSettingsEl} />
      </div>
    </div>
  );
}
