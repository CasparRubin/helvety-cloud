import {
  createdAtCursorSchema,
  sortOrderCursorSchema,
  type CreatedAtCursor,
  type SortOrderCursor,
} from "@helvety-cloud/api-contract";

function encodeBase64UrlJson(payload: object): string {
  const json = JSON.stringify(payload);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64UrlJson(raw: string): unknown {
  const padded =
    raw.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (raw.length % 4)) % 4);
  return JSON.parse(atob(padded)) as unknown;
}

export function encodeSortOrderCursor(cursor: SortOrderCursor): string {
  return encodeBase64UrlJson({
    sortOrder: cursor.sortOrder,
    id: cursor.id,
  });
}

export function decodeSortOrderCursor(raw: string): SortOrderCursor | null {
  try {
    const parsed = sortOrderCursorSchema.safeParse(decodeBase64UrlJson(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function encodeCreatedAtCursor(cursor: CreatedAtCursor): string {
  return encodeBase64UrlJson({
    createdAt: cursor.createdAt,
    id: cursor.id,
  });
}

export function decodeCreatedAtCursor(raw: string): CreatedAtCursor | null {
  try {
    const parsed = createdAtCursorSchema.safeParse(decodeBase64UrlJson(raw));
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

function parseCommonListParams(url: URL):
  | {
      ok: true;
      limit: number;
      cursorRaw: string | null;
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

  return {
    ok: true,
    limit,
    cursorRaw: url.searchParams.get("cursor"),
    includeDeleted: url.searchParams.get("includeDeleted") === "true",
  };
}

/** Parse list query; keyset cursor is sort_order ASC, id ASC. */
export function parseListSearchParams(url: URL):
  | {
      ok: true;
      limit: number;
      cursor: SortOrderCursor | null;
      includeDeleted: boolean;
    }
  | { ok: false; message: string } {
  const common = parseCommonListParams(url);
  if (!common.ok) return common;

  let cursor: SortOrderCursor | null = null;
  if (common.cursorRaw) {
    cursor = decodeSortOrderCursor(common.cursorRaw);
    if (!cursor) {
      return { ok: false, message: "invalid cursor" };
    }
  }

  return {
    ok: true,
    limit: common.limit,
    cursor,
    includeDeleted: common.includeDeleted,
  };
}

/** Parse task list query including optional categorization filters. */
export function parseTaskListSearchParams(url: URL):
  | {
      ok: true;
      limit: number;
      cursor: SortOrderCursor | null;
      includeDeleted: boolean;
      labelId?: string;
      stageId?: string;
      priorityId?: string;
      milestoneId?: string;
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
  const milestone = parseOptionalUuid(
    url.searchParams.get("milestoneId"),
    "milestoneId",
  );
  if (!milestone.ok) return milestone;

  return {
    ok: true,
    limit: base.limit,
    cursor: base.cursor,
    includeDeleted: base.includeDeleted,
    labelId: label.value,
    stageId: stage.value,
    priorityId: priority.value,
    milestoneId: milestone.value,
  };
}

/** Parse notes list query; keyset cursor is created_at DESC, id DESC. */
export function parseNotesListSearchParams(url: URL):
  | {
      ok: true;
      limit: number;
      cursor: CreatedAtCursor | null;
      includeDeleted: boolean;
    }
  | { ok: false; message: string } {
  const common = parseCommonListParams(url);
  if (!common.ok) return common;

  let cursor: CreatedAtCursor | null = null;
  if (common.cursorRaw) {
    cursor = decodeCreatedAtCursor(common.cursorRaw);
    if (!cursor) {
      return { ok: false, message: "invalid cursor" };
    }
  }

  return {
    ok: true,
    limit: common.limit,
    cursor,
    includeDeleted: common.includeDeleted,
  };
}
