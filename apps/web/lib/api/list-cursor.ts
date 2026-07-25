import {
  sortOrderCursorSchema,
  type SortOrderCursor,
} from "@helvety-cloud/api-contract";

/** Encode keyset cursor as base64url JSON. */
export function encodeSortOrderCursor(cursor: SortOrderCursor): string {
  const json = JSON.stringify({
    sortOrder: cursor.sortOrder,
    id: cursor.id,
  });
  return btoa(json)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Decode opaque cursor; returns null if invalid. */
export function decodeSortOrderCursor(
  raw: string,
): SortOrderCursor | null {
  try {
    const padded =
      raw.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (raw.length % 4)) % 4);
    const json: unknown = JSON.parse(atob(padded));
    const parsed = sortOrderCursorSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseOptionalUuid(
  raw: string | null,
  field: string,
): { ok: true; value: string | undefined } | { ok: false; message: string } {
  if (raw === null || raw === "") {
    return { ok: true, value: undefined };
  }
  if (!UUID_RE.test(raw)) {
    return { ok: false, message: `${field} must be a uuid` };
  }
  return { ok: true, value: raw };
}

/**
 * Parse list query from URL search params.
 * Returns `{ ok: false, message }` on invalid cursor/limit.
 */
export function parseListSearchParams(url: URL):
  | {
      ok: true;
      limit: number;
      cursor: SortOrderCursor | null;
      includeDeleted: boolean;
    }
  | { ok: false; message: string } {
  const limitRaw = url.searchParams.get("limit");
  let limit = 50;
  if (limitRaw !== null) {
    const n = Number(limitRaw);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return { ok: false, message: "limit must be an integer 1–100" };
    }
    limit = n;
  }

  const cursorRaw = url.searchParams.get("cursor");
  let cursor: SortOrderCursor | null = null;
  if (cursorRaw) {
    cursor = decodeSortOrderCursor(cursorRaw);
    if (!cursor) {
      return { ok: false, message: "invalid cursor" };
    }
  }

  const includeDeleted = url.searchParams.get("includeDeleted") === "true";

  return { ok: true, limit, cursor, includeDeleted };
}

/**
 * Parse task list query including optional categorization filters.
 */
export function parseTaskListSearchParams(url: URL):
  | {
      ok: true;
      limit: number;
      cursor: SortOrderCursor | null;
      includeDeleted: boolean;
      labelId?: string;
      stageId?: string;
      priorityId?: string;
    }
  | { ok: false; message: string } {
  const base = parseListSearchParams(url);
  if (!base.ok) return base;

  const label = parseOptionalUuid(url.searchParams.get("labelId"), "labelId");
  if (!label.ok) return label;
  const stage = parseOptionalUuid(url.searchParams.get("stageId"), "stageId");
  if (!stage.ok) return stage;
  const priority = parseOptionalUuid(
    url.searchParams.get("priorityId"),
    "priorityId",
  );
  if (!priority.ok) return priority;

  return {
    ok: true,
    limit: base.limit,
    cursor: base.cursor,
    includeDeleted: base.includeDeleted,
    labelId: label.value,
    stageId: stage.value,
    priorityId: priority.value,
  };
}
