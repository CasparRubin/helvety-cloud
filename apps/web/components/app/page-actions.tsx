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
import { RefreshCwIcon, SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

type PageActionsContextValue = {
  refreshEl: HTMLElement | null;
  actionsEl: HTMLElement | null;
  dangerEl: HTMLElement | null;
  settingsEl: HTMLElement | null;
  setRefreshEl: (el: HTMLElement | null) => void;
  setActionsEl: (el: HTMLElement | null) => void;
  setDangerEl: (el: HTMLElement | null) => void;
  setSettingsEl: (el: HTMLElement | null) => void;
};

const PageActionsContext = createContext<PageActionsContextValue | null>(null);

export function PageActionsProvider({ children }: { children: ReactNode }) {
  const [refreshEl, setRefreshElState] = useState<HTMLElement | null>(null);
  const [actionsEl, setActionsElState] = useState<HTMLElement | null>(null);
  const [dangerEl, setDangerElState] = useState<HTMLElement | null>(null);
  const [settingsEl, setSettingsElState] = useState<HTMLElement | null>(null);

  const setRefreshEl = useCallback((el: HTMLElement | null) => {
    setRefreshElState((prev) => (prev === el ? prev : el));
  }, []);

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
      refreshEl,
      actionsEl,
      dangerEl,
      settingsEl,
      setRefreshEl,
      setActionsEl,
      setDangerEl,
      setSettingsEl,
    }),
    [
      refreshEl,
      actionsEl,
      dangerEl,
      settingsEl,
      setRefreshEl,
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

/** Portals primary actions (create, etc.) into the sticky bar after Refresh. */
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

/** Standalone refresh control; portals next to Back, outside the create ButtonGroup. */
export function ListRefreshButton({
  onRefresh,
  disabled,
}: {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}) {
  const { refreshEl } = usePageActionsContext();
  const [refreshing, setRefreshing] = useState(false);

  async function handleClick() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  if (!refreshEl) return null;

  return createPortal(
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled || refreshing}
      aria-label="Refresh list"
      onClick={() => void handleClick()}
    >
      <RefreshCwIcon className={refreshing ? "animate-spin" : undefined} />
      <span className="hidden sm:inline">Refresh</span>
    </Button>,
    refreshEl,
  );
}

export function PageActionsSlot() {
  const { setRefreshEl, setActionsEl, setDangerEl, setSettingsEl } =
    usePageActionsContext();
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
      <div ref={setRefreshEl} className="shrink-0" />
      <ButtonGroup ref={setActionsEl} className="shrink-0" />
      <div className="ml-auto flex shrink-0 items-stretch gap-2">
        <ButtonGroup ref={setDangerEl} />
        <ButtonGroup ref={setSettingsEl} />
      </div>
    </div>
  );
}
