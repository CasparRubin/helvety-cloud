"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  DEFAULT_DATETIME_PREFS,
  loadDateTimePrefs,
  storeDateTimePrefs,
  subscribeDateTimePrefs,
  type DateTimePrefs,
} from "@/lib/format-datetime";

type DateTimePrefsContextValue = {
  prefs: DateTimePrefs;
  setPrefs: (next: DateTimePrefs) => void;
};

const DateTimePrefsContext = createContext<DateTimePrefsContextValue | null>(
  null,
);

export function DatetimePrefsProvider({ children }: { children: ReactNode }) {
  const prefs = useSyncExternalStore(
    subscribeDateTimePrefs,
    loadDateTimePrefs,
    () => DEFAULT_DATETIME_PREFS,
  );

  function setPrefs(next: DateTimePrefs) {
    storeDateTimePrefs(next);
  }

  return (
    <DateTimePrefsContext.Provider value={{ prefs, setPrefs }}>
      {children}
    </DateTimePrefsContext.Provider>
  );
}

export function useDateTimePrefs(): DateTimePrefsContextValue {
  const ctx = useContext(DateTimePrefsContext);
  if (!ctx) {
    throw new Error("useDateTimePrefs must be used within DatetimePrefsProvider");
  }
  return ctx;
}
