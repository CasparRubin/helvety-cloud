import {
  entityLinkKindSchema,
  isAllowedLinkPair,
  type EntityLinkTarget,
} from "@helvety-cloud/api-contract";

export type BoardViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type BoardGraphNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data?: Record<string, unknown>;
  width?: number;
  height?: number;
};

export type BoardGraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
};

export type BoardPlaintext = {
  version: 1;
  title: string;
  viewport?: BoardViewport;
  nodes: BoardGraphNode[];
  edges: BoardGraphEdge[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseViewport(raw: unknown): BoardViewport | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const obj = raw as Record<string, unknown>;
  if (
    !isFiniteNumber(obj.x) ||
    !isFiniteNumber(obj.y) ||
    !isFiniteNumber(obj.zoom)
  ) {
    return undefined;
  }
  return { x: obj.x, y: obj.y, zoom: obj.zoom };
}

function parseNode(raw: unknown): BoardGraphNode | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;
  const pos = obj.position;
  if (typeof pos !== "object" || pos === null) return null;
  const p = pos as Record<string, unknown>;
  if (!isFiniteNumber(p.x) || !isFiniteNumber(p.y)) return null;
  const node: BoardGraphNode = {
    id: obj.id,
    position: { x: p.x, y: p.y },
  };
  if (typeof obj.type === "string") node.type = obj.type;
  if (typeof obj.data === "object" && obj.data !== null) {
    node.data = obj.data as Record<string, unknown>;
  }
  if (isFiniteNumber(obj.width)) node.width = obj.width;
  if (isFiniteNumber(obj.height)) node.height = obj.height;
  return node;
}

function parseEdge(raw: unknown): BoardGraphEdge | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.id !== "string" ||
    typeof obj.source !== "string" ||
    typeof obj.target !== "string"
  ) {
    return null;
  }
  const edge: BoardGraphEdge = {
    id: obj.id,
    source: obj.source,
    target: obj.target,
  };
  if (typeof obj.type === "string") edge.type = obj.type;
  if (obj.sourceHandle === null || typeof obj.sourceHandle === "string") {
    edge.sourceHandle = obj.sourceHandle;
  }
  if (obj.targetHandle === null || typeof obj.targetHandle === "string") {
    edge.targetHandle = obj.targetHandle;
  }
  return edge;
}

export function parseBoardPlaintext(raw: unknown): BoardPlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid board plaintext");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error("Invalid board plaintext");
  }
  if (typeof obj.title !== "string") {
    throw new Error("Invalid board plaintext");
  }
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
    throw new Error("Invalid board plaintext");
  }
  const nodes: BoardGraphNode[] = [];
  for (const n of obj.nodes) {
    const parsed = parseNode(n);
    if (parsed) nodes.push(parsed);
  }
  const edges: BoardGraphEdge[] = [];
  for (const e of obj.edges) {
    const parsed = parseEdge(e);
    if (parsed) edges.push(parsed);
  }
  return {
    version: 1,
    title: obj.title,
    viewport: parseViewport(obj.viewport),
    nodes,
    edges,
  };
}

export function toBoardPlaintext(input: {
  title: string;
  nodes: BoardGraphNode[];
  edges: BoardGraphEdge[];
  viewport?: BoardViewport;
}): BoardPlaintext {
  return {
    version: 1,
    title: input.title.trim(),
    viewport: input.viewport,
    nodes: input.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
      width: n.width,
      height: n.height,
    })),
    edges: input.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: e.type,
    })),
  };
}

/** Collect entity_links targets from entityRef nodes on the board. */
export function extractEntityLinksFromBoardNodes(
  nodes: BoardGraphNode[],
): EntityLinkTarget[] {
  const seen = new Set<string>();
  const out: EntityLinkTarget[] = [];
  for (const node of nodes) {
    if (node.type !== "entityRef") continue;
    const kindRaw = node.data?.kind;
    const idRaw = node.data?.entityId;
    if (typeof kindRaw !== "string" || typeof idRaw !== "string") continue;
    const kindParsed = entityLinkKindSchema.safeParse(kindRaw);
    if (!kindParsed.success) continue;
    if (kindParsed.data === "board") continue;
    if (!isAllowedLinkPair("board", kindParsed.data)) continue;
    const key = `${kindParsed.data}:${idRaw}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: kindParsed.data, id: idRaw });
  }
  return out;
}
