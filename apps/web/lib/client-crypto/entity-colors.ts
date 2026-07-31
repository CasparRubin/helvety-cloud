/** Fixed palette tokens for entity accent colors (stored in ciphertext). */
export const ENTITY_COLOR_TOKENS = [
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
] as const;

export type EntityColor = (typeof ENTITY_COLOR_TOKENS)[number];

export function isEntityColor(value: unknown): value is EntityColor {
  return (
    typeof value === "string" &&
    (ENTITY_COLOR_TOKENS as readonly string[]).includes(value)
  );
}

/** Kind-level chip colors. Projects may override via ciphertext `color`; notes/contacts always use these. */
export const KIND_FALLBACK_COLOR: Record<
  "task" | "contact" | "note" | "project" | "board",
  EntityColor
> = {
  task: "blue",
  contact: "green",
  note: "slate",
  project: "violet",
  board: "teal",
};

/** Tailwind class maps for entity accent colors (chips, washes, dots). */
export const ENTITY_COLOR_CLASSES: Record<
  EntityColor,
  { bg: string; wash: string; text: string; ring: string; dot: string }
> = {
  slate: {
    bg: "bg-slate-500/15",
    wash: "bg-slate-500/8",
    text: "text-slate-700 dark:text-slate-200",
    ring: "ring-slate-500/30",
    dot: "bg-slate-500",
  },
  red: {
    bg: "bg-red-500/15",
    wash: "bg-red-500/8",
    text: "text-red-700 dark:text-red-300",
    ring: "ring-red-500/30",
    dot: "bg-red-500",
  },
  orange: {
    bg: "bg-orange-500/15",
    wash: "bg-orange-500/8",
    text: "text-orange-700 dark:text-orange-300",
    ring: "ring-orange-500/30",
    dot: "bg-orange-500",
  },
  amber: {
    bg: "bg-amber-500/15",
    wash: "bg-amber-500/8",
    text: "text-amber-800 dark:text-amber-200",
    ring: "ring-amber-500/30",
    dot: "bg-amber-500",
  },
  green: {
    bg: "bg-green-500/15",
    wash: "bg-green-500/8",
    text: "text-green-700 dark:text-green-300",
    ring: "ring-green-500/30",
    dot: "bg-green-500",
  },
  teal: {
    bg: "bg-teal-500/15",
    wash: "bg-teal-500/8",
    text: "text-teal-700 dark:text-teal-300",
    ring: "ring-teal-500/30",
    dot: "bg-teal-500",
  },
  blue: {
    bg: "bg-blue-500/15",
    wash: "bg-blue-500/8",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-500/30",
    dot: "bg-blue-500",
  },
  violet: {
    bg: "bg-violet-500/15",
    wash: "bg-violet-500/8",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/30",
    dot: "bg-violet-500",
  },
  pink: {
    bg: "bg-pink-500/15",
    wash: "bg-pink-500/8",
    text: "text-pink-700 dark:text-pink-300",
    ring: "ring-pink-500/30",
    dot: "bg-pink-500",
  },
};
