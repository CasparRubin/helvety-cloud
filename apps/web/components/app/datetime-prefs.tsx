"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  getServerDateTimePrefs,
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
    getServerDateTimePrefs,
  );

  return (
    <DateTimePrefsContext.Provider
      value={{ prefs, setPrefs: storeDateTimePrefs }}
    >
      {children}
    </DateTimePrefsContext.Provider>
  );
}

export function useDateTimePrefs(): DateTimePrefsContextValue {
  const ctx = useContext(DateTimePrefsContext);
  if (!ctx) {
    throw new Error(
      "useDateTimePrefs must be used within DatetimePrefsProvider",
    );
  }
  return ctx;
}
