export type SnapPoint = { x: number; y: number };

export type SnapNode = {
  id: string;
  type?: string | null;
  position: SnapPoint;
  width?: number | null;
  height?: number | null;
  measured?: { width?: number; height?: number } | null;
};

export type SnapEdge = {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

const THRESHOLD_PX = 8;

type HandleSide = "left" | "right" | "top" | "bottom";

const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  startEvent: { width: 48, height: 48 },
  endEvent: { width: 48, height: 48 },
  exclusiveGateway: { width: 56, height: 56 },
  bpmnTask: { width: 120, height: 36 },
  userTask: { width: 120, height: 44 },
  serviceTask: { width: 120, height: 44 },
  participant: { width: 140, height: 32 },
  annotation: { width: 140, height: 56 },
  entityRef: { width: 140, height: 44 },
};

const FALLBACK_SIZE = { width: 120, height: 40 };

function handleSide(
  role: "source" | "target",
  handleId: string | null | undefined,
): HandleSide {
  if (handleId === "t") return "top";
  if (handleId === "b") return "bottom";
  if (role === "source") return "right";
  return "left";
}

function isHorizontalPair(a: HandleSide, b: HandleSide): boolean {
  return (a === "left" || a === "right") && (b === "left" || b === "right");
}

function isVerticalPair(a: HandleSide, b: HandleSide): boolean {
  return (a === "top" || a === "bottom") && (b === "top" || b === "bottom");
}

function nodeDimensions(node: SnapNode): { width: number; height: number } {
  const fallback = DEFAULT_SIZES[node.type ?? ""] ?? FALLBACK_SIZE;
  return {
    width: node.measured?.width ?? node.width ?? fallback.width,
    height: node.measured?.height ?? node.height ?? fallback.height,
  };
}

function handleCenter(
  position: SnapPoint,
  size: { width: number; height: number },
  side: HandleSide,
): SnapPoint {
  switch (side) {
    case "left":
      return { x: position.x, y: position.y + size.height / 2 };
    case "right":
      return { x: position.x + size.width, y: position.y + size.height / 2 };
    case "top":
      return { x: position.x + size.width / 2, y: position.y };
    case "bottom":
      return { x: position.x + size.width / 2, y: position.y + size.height };
    default: {
      const _exhaustive: never = side;
      return _exhaustive;
    }
  }
}

export function snapDraggedNodePosition(
  dragged: SnapNode,
  nodes: SnapNode[],
  edges: SnapEdge[],
  thresholdPx: number = THRESHOLD_PX,
): SnapPoint {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const size = nodeDimensions(dragged);
  let nextX = dragged.position.x;
  let nextY = dragged.position.y;
  let bestDx = thresholdPx;
  let bestDy = thresholdPx;

  for (const edge of edges) {
    const asSource = edge.source === dragged.id;
    const asTarget = edge.target === dragged.id;
    if (!asSource && !asTarget) continue;

    const peer = byId.get(asSource ? edge.target : edge.source);
    if (!peer) continue;

    const sourceSide = handleSide("source", edge.sourceHandle);
    const targetSide = handleSide("target", edge.targetHandle);
    const horizontal = isHorizontalPair(sourceSide, targetSide);
    const vertical = isVerticalPair(sourceSide, targetSide);
    if (!horizontal && !vertical) continue;

    const peerCenter = handleCenter(
      peer.position,
      nodeDimensions(peer),
      asSource ? targetSide : sourceSide,
    );

    if (horizontal) {
      const desiredY = peerCenter.y - size.height / 2;
      const dy = Math.abs(desiredY - dragged.position.y);
      if (dy < bestDy) {
        bestDy = dy;
        nextY = desiredY;
      }
    } else {
      const desiredX = peerCenter.x - size.width / 2;
      const dx = Math.abs(desiredX - dragged.position.x);
      if (dx < bestDx) {
        bestDx = dx;
        nextX = desiredX;
      }
    }
  }

  return { x: nextX, y: nextY };
}
