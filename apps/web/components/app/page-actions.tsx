"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { ButtonGroup } from "@/components/ui/button-group";

type PageActionsContextValue = {
  slotEl: HTMLElement | null;
  setSlotEl: (el: HTMLElement | null) => void;
};

const PageActionsContext = createContext<PageActionsContextValue | null>(null);

export function PageActionsProvider({ children }: { children: ReactNode }) {
  const [slotEl, setSlotElState] = useState<HTMLElement | null>(null);
  const setSlotEl = useCallback((el: HTMLElement | null) => {
    setSlotElState((prev) => (prev === el ? prev : el));
  }, []);

  const value = useMemo(
    () => ({ slotEl, setSlotEl }),
    [slotEl, setSlotEl],
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

/** Portals actions into the sticky secondary bar. */
export function PageActions({ children }: { children: ReactNode }) {
  const { slotEl } = usePageActionsContext();
  if (!slotEl) return null;
  return createPortal(children, slotEl);
}

export function PageActionsSlot() {
  const { setSlotEl } = usePageActionsContext();
  return <ButtonGroup className="ml-auto" ref={setSlotEl} />;
}
