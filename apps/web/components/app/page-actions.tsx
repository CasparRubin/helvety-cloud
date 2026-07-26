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
  settingsEl: HTMLElement | null;
  setActionsEl: (el: HTMLElement | null) => void;
  setSettingsEl: (el: HTMLElement | null) => void;
};

const PageActionsContext = createContext<PageActionsContextValue | null>(null);

export function PageActionsProvider({ children }: { children: ReactNode }) {
  const [actionsEl, setActionsElState] = useState<HTMLElement | null>(null);
  const [settingsEl, setSettingsElState] = useState<HTMLElement | null>(null);

  const setActionsEl = useCallback((el: HTMLElement | null) => {
    setActionsElState((prev) => (prev === el ? prev : el));
  }, []);

  const setSettingsEl = useCallback((el: HTMLElement | null) => {
    setSettingsElState((prev) => (prev === el ? prev : el));
  }, []);

  const value = useMemo(
    () => ({ actionsEl, settingsEl, setActionsEl, setSettingsEl }),
    [actionsEl, settingsEl, setActionsEl, setSettingsEl],
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

/** Portals primary actions into the sticky secondary bar. */
export function PageActions({ children }: { children: ReactNode }) {
  const { actionsEl } = usePageActionsContext();
  if (!actionsEl) return null;
  return createPortal(children, actionsEl);
}

/** Portals settings actions; always rendered to the right of primary actions. */
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
        variant="outline"
        size="sm"
        render={<Link href={`/app/w/${workspaceId}/settings/general`} />}
        nativeButton={false}
      >
        <SettingsIcon />
        Workspace settings
      </Button>
    </PageSettingsActions>
  );
}

export function PageActionsSlot() {
  const { setActionsEl, setSettingsEl } = usePageActionsContext();
  return (
    <div className="ml-auto flex items-stretch gap-2">
      <ButtonGroup ref={setActionsEl} />
      <ButtonGroup ref={setSettingsEl} />
    </div>
  );
}
