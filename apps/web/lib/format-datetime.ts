export type DateTimePreset = "european" | "us" | "iso";

export type DateTimePrefs = {
  preset: DateTimePreset;
  relative: boolean;
};

export const DEFAULT_DATETIME_PREFS: DateTimePrefs = {
  preset: "european",
  relative: true,
};

export const DATETIME_PRESETS: { id: DateTimePreset; label: string }[] = [
  { id: "european", label: "European" },
  { id: "us", label: "US" },
  { id: "iso", label: "ISO" },
];

const STORAGE_KEY = "helvety.ui.datetimePrefs";

const listeners = new Set<() => void>();

let snapshot: DateTimePrefs = DEFAULT_DATETIME_PREFS;
let snapshotRaw: string | null = null;
let snapshotReady = false;

function emitDateTimePrefs(): void {
  for (const listener of listeners) listener();
}

export function subscribeDateTimePrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isPreset(value: unknown): value is DateTimePreset {
  return value === "european" || value === "us" || value === "iso";
}

function prefsEqual(a: DateTimePrefs, b: DateTimePrefs): boolean {
  return a.preset === b.preset && a.relative === b.relative;
}

function parsePrefs(raw: string): DateTimePrefs {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return DEFAULT_DATETIME_PREFS;
  const obj = parsed as { preset?: unknown; relative?: unknown };
  return {
    preset: isPreset(obj.preset) ? obj.preset : DEFAULT_DATETIME_PREFS.preset,
    relative:
      typeof obj.relative === "boolean"
        ? obj.relative
        : DEFAULT_DATETIME_PREFS.relative,
  };
}

/** Cached snapshot for useSyncExternalStore (stable reference when unchanged). */
export function loadDateTimePrefs(): DateTimePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (snapshotReady && raw === snapshotRaw) return snapshot;
    snapshotReady = true;
    snapshotRaw = raw;
    const next = raw ? parsePrefs(raw) : DEFAULT_DATETIME_PREFS;
    if (!prefsEqual(snapshot, next)) snapshot = next;
    return snapshot;
  } catch {
    return DEFAULT_DATETIME_PREFS;
  }
}

export function getServerDateTimePrefs(): DateTimePrefs {
  return DEFAULT_DATETIME_PREFS;
}

export function storeDateTimePrefs(prefs: DateTimePrefs): void {
  const raw = JSON.stringify(prefs);
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // ignore
  }
  snapshotReady = true;
  snapshotRaw = raw;
  if (!prefsEqual(snapshot, prefs)) snapshot = prefs;
  emitDateTimePrefs();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseInstant(iso: string): Date | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Parse `YYYY-MM-DD` as a local calendar day, or a full ISO instant. */
function parseDisplayDate(isoOrYmd: string): Date | null {
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoOrYmd);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  return parseInstant(isoOrYmd);
}

function formatAbsoluteDate(date: Date, preset: DateTimePreset): string {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  switch (preset) {
    case "european":
      return `${pad2(d)}.${pad2(m)}.${y}`;
    case "us":
      return `${pad2(m)}/${pad2(d)}/${y}`;
    case "iso":
      return `${y}-${pad2(m)}-${pad2(d)}`;
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

function formatAbsoluteTime(date: Date, preset: DateTimePreset): string {
  const h = date.getHours();
  const min = date.getMinutes();
  const sec = date.getSeconds();
  switch (preset) {
    case "european":
    case "iso":
      return `${pad2(h)}:${pad2(min)}:${pad2(sec)}`;
    case "us": {
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${pad2(min)}:${pad2(sec)} ${ampm}`;
    }
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

function formatRelative(date: Date, now = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return rtf.format(0, "second");
}

export function formatDateTime(
  iso: string,
  prefs: DateTimePrefs = DEFAULT_DATETIME_PREFS,
): string {
  const date = parseInstant(iso);
  if (!date) return iso;
  const absolute = `${formatAbsoluteDate(date, prefs.preset)} ${formatAbsoluteTime(date, prefs.preset)}`;
  if (!prefs.relative) return absolute;
  return `${absolute} (${formatRelative(date)})`;
}

export function formatDate(
  isoOrYmd: string,
  prefs: DateTimePrefs = DEFAULT_DATETIME_PREFS,
): string {
  const date = parseDisplayDate(isoOrYmd);
  if (!date) return isoOrYmd;
  return formatAbsoluteDate(date, prefs.preset);
}

export function formatTime(
  iso: string,
  prefs: DateTimePrefs = DEFAULT_DATETIME_PREFS,
): string {
  const date = parseInstant(iso);
  if (!date) return iso;
  return formatAbsoluteTime(date, prefs.preset);
}

/** Display helper: range, a single date, or `No dates`. */
export function formatDateRange(
  startDate: string | null,
  endDate: string | null,
  prefs: DateTimePrefs = DEFAULT_DATETIME_PREFS,
): string {
  if (startDate && endDate) {
    return `${formatDate(startDate, prefs)} – ${formatDate(endDate, prefs)}`;
  }
  if (startDate) return formatDate(startDate, prefs);
  if (endDate) return formatDate(endDate, prefs);
  return "No dates";
}
