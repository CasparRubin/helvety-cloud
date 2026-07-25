/** Curated Lucide icon tokens for categorization options (ciphertext). */

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BanIcon,
  BookmarkIcon,
  BugIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
  ClipboardCheckIcon,
  ClockIcon,
  FlagIcon,
  FlameIcon,
  FlaskConicalIcon,
  GitPullRequestIcon,
  HashIcon,
  InboxIcon,
  LayersIcon,
  LightbulbIcon,
  LoaderIcon,
  MinusIcon,
  RocketIcon,
  SearchIcon,
  SparklesIcon,
  SquareIcon,
  StarIcon,
  TagIcon,
  TargetIcon,
  TriangleIcon,
  WrenchIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react";

export const CATEGORIZATION_ICON_TOKENS = [
  "bug",
  "sparkles",
  "git-pull-request",
  "inbox",
  "search",
  "circle-dot",
  "loader",
  "flask-conical",
  "clipboard-check",
  "check-circle",
  "x-circle",
  "arrow-down",
  "minus",
  "arrow-up",
  "flame",
  "tag",
  "flag",
  "star",
  "circle",
  "square",
  "triangle",
  "alert-triangle",
  "clock",
  "zap",
  "target",
  "layers",
  "bookmark",
  "hash",
  "lightbulb",
  "wrench",
  "rocket",
  "ban",
] as const;

export type CategorizationIcon = (typeof CATEGORIZATION_ICON_TOKENS)[number];

export function isCategorizationIcon(
  value: unknown,
): value is CategorizationIcon {
  return (
    typeof value === "string" &&
    (CATEGORIZATION_ICON_TOKENS as readonly string[]).includes(value)
  );
}

/** Lucide component for each allowlisted token. */
export const CATEGORIZATION_ICON_COMPONENTS: Record<
  CategorizationIcon,
  LucideIcon
> = {
  bug: BugIcon,
  sparkles: SparklesIcon,
  "git-pull-request": GitPullRequestIcon,
  inbox: InboxIcon,
  search: SearchIcon,
  "circle-dot": CircleDotIcon,
  loader: LoaderIcon,
  "flask-conical": FlaskConicalIcon,
  "clipboard-check": ClipboardCheckIcon,
  "check-circle": CheckCircle2Icon,
  "x-circle": XCircleIcon,
  "arrow-down": ArrowDownIcon,
  minus: MinusIcon,
  "arrow-up": ArrowUpIcon,
  flame: FlameIcon,
  tag: TagIcon,
  flag: FlagIcon,
  star: StarIcon,
  circle: CircleIcon,
  square: SquareIcon,
  triangle: TriangleIcon,
  "alert-triangle": AlertTriangleIcon,
  clock: ClockIcon,
  zap: ZapIcon,
  target: TargetIcon,
  layers: LayersIcon,
  bookmark: BookmarkIcon,
  hash: HashIcon,
  lightbulb: LightbulbIcon,
  wrench: WrenchIcon,
  rocket: RocketIcon,
  ban: BanIcon,
};

/** Icons written into `defaultCategorizations()` seeds. */
export const DEFAULT_OPTION_ICONS: Record<string, CategorizationIcon> = {
  Bug: "bug",
  "New Feature": "sparkles",
  "Change Request": "git-pull-request",
  Backlog: "inbox",
  Discovery: "search",
  Ready: "circle-dot",
  "In Progress": "loader",
  Testing: "flask-conical",
  Acceptance: "clipboard-check",
  Completed: "check-circle",
  Cancelled: "x-circle",
  Low: "arrow-down",
  Normal: "minus",
  High: "arrow-up",
  Urgent: "flame",
};
