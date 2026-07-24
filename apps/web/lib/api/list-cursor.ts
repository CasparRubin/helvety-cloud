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
