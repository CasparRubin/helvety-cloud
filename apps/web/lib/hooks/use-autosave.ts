"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const DEFAULT_DELAY_MS = 600;

function snapshotOf<T>(value: T): string {
  return JSON.stringify(value);
}

/** Debounced autosave with dirty-diff, coalesce-while-saving, and pagehide flush. */
export function useAutosave<T>(opts: {
  draft: T;
  enabled: boolean;
  save: (draft: T) => Promise<T | void>;
  delayMs?: number;
  onError?: (message: string) => void;
  /** Called with the canonical draft only when the live draft still matches what was saved. */
  onSaved?: (canonical: T) => void;
}): {
  status: AutosaveStatus;
  savedAt: string | null;
  flush: () => void;
} {
  const {
    draft,
    enabled,
    save,
    delayMs = DEFAULT_DELAY_MS,
    onError,
    onSaved,
  } = opts;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const draftRef = useRef(draft);
  const enabledRef = useRef(enabled);
  const saveRef = useRef(save);
  const onErrorRef = useRef(onError);
  const onSavedRef = useRef(onSaved);
  const baselineRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const mountedRef = useRef(true);
  const persistRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    draftRef.current = draft;
    enabledRef.current = enabled;
    saveRef.current = save;
    onErrorRef.current = onError;
    onSavedRef.current = onSaved;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const persist = useCallback(async () => {
    if (!enabledRef.current) return;

    const nextDraft = draftRef.current;
    const snap = snapshotOf(nextDraft);
    if (snap === baselineRef.current) {
      if (mountedRef.current) {
        setStatus((s) => (s === "dirty" ? "idle" : s));
      }
      return;
    }

    if (savingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    savingRef.current = true;
    if (mountedRef.current) {
      setStatus("saving");
    }

    try {
      const result = await saveRef.current(nextDraft);
      const canonical = result === undefined ? nextDraft : result;
      baselineRef.current = snapshotOf(canonical);

      if (!mountedRef.current) return;

      if (snapshotOf(draftRef.current) === snap) {
        onSavedRef.current?.(canonical);
      }

      setSavedAt(new Date().toLocaleTimeString());
      setStatus("saved");
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : "Save failed";
      onErrorRef.current?.(message);
      setStatus("error");
    } finally {
      savingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        await persistRef.current();
      }
    }
  }, []);

  useEffect(() => {
    persistRef.current = persist;
  });

  useEffect(() => {
    if (!enabled) return;
    if (baselineRef.current === null) {
      baselineRef.current = snapshotOf(draft);
      return;
    }

    const snap = snapshotOf(draft);
    if (snap === baselineRef.current) return;

    setStatus("dirty");
    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [draft, enabled, delayMs]);

  useEffect(() => {
    function flushIfDirty() {
      if (!enabledRef.current) return;
      if (baselineRef.current === null) return;
      if (snapshotOf(draftRef.current) === baselineRef.current) return;
      void persistRef.current();
    }

    const onPageHide = () => flushIfDirty();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      flushIfDirty();
    };
  }, []);

  const flush = useCallback(() => {
    void persistRef.current();
  }, []);

  return { status, savedAt, flush };
}
