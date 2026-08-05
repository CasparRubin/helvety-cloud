"use client";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnMoveEnd,
  type OnNodesChange,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "@wrksz/themes/client";
import {
  ArrowRightIcon,
  CircleIcon,
  DiamondIcon,
  FolderKanbanIcon,
  MessageSquareIcon,
  ContactIcon,
  ListTodoIcon,
  StickyNoteIcon,
  SquareIcon,
  UsersIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EntityLinkKind } from "@helvety-cloud/api-contract";

import { boardEdgeTypes, withoutEdgeEditing } from "@/components/app/board-edge";
import {
  boardNodeTypes,
  isBoardTextAnchor,
  type BoardNodeColors,
  type BoardTextAnchor,
} from "@/components/app/board-nodes";
import { BoardStencilLibrary } from "@/components/app/board-stencil-library";
import { useEntityCache } from "@/components/unlock/entity-cache";
import type { BoardStencil } from "@/lib/client-crypto/board-stencils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { snapDraggedNodePosition } from "@/lib/client-crypto/board-edge-snap";
import { formatContactName } from "@/lib/client-crypto/contact-plaintext";
import type {
  BoardGraphEdge,
  BoardGraphNode,
  BoardViewport,
} from "@/lib/client-crypto/board-plaintext";
import {
  isUnlimited,
  nodesPerBoardLimitMessage,
  type Plan,
} from "@/lib/billing/entitlements";
import { cn } from "@/lib/utils";

export type BoardCanvasGraph = {
  nodes: BoardGraphNode[];
  edges: BoardGraphEdge[];
};

type BoardCanvasProps = {
  initialNodes: BoardGraphNode[];
  initialEdges: BoardGraphEdge[];
  initialViewport?: BoardViewport;
  onGraphChange: (graph: BoardCanvasGraph) => void;
  onViewportIdle: (viewport: BoardViewport) => void;
  /** Max shapes (nodes) per board; null means unlimited. Client-enforced. */
  nodesPerBoard: number | null;
  plan: Plan;
  onShapeLimitReached?: (message: string) => void;
};

type PlaceKind = "note" | "contact" | "task" | "project";

const TEXT_CAPABLE_NODE_TYPES = new Set([
  "startEvent",
  "endEvent",
  "bpmnTask",
  "userTask",
  "serviceTask",
  "participant",
  "exclusiveGateway",
  "stencil",
]);

const TEXT_ANCHOR_GRID: (BoardTextAnchor | null)[] = [
  "top-left",
  "top",
  "top-right",
  "left",
  null,
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

const ARROW_MARKER = {
  type: MarkerType.ArrowClosed,
  width: 16,
  height: 16,
} as const;

const defaultEdgeOptions = {
  type: "smoothstep" as const,
};

function flowEdgeHasArrow(markerEnd: Edge["markerEnd"]): boolean {
  if (markerEnd == null || markerEnd === "") return false;
  if (typeof markerEnd === "object") {
    return markerEnd.type === MarkerType.ArrowClosed;
  }
  // React Flow may resolve markers to a marker URL string.
  return true;
}

function toFlowNodes(nodes: BoardGraphNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data ?? {},
    width: n.width,
    height: n.height,
  }));
}

function toFlowEdges(edges: BoardGraphEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    type: e.type ?? "smoothstep",
    label: e.label,
    markerEnd: e.markerEnd === "arrow" ? ARROW_MARKER : undefined,
  }));
}

function fromFlowNodes(nodes: Node[]): BoardGraphNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: (n.data ?? {}) as Record<string, unknown>,
    width: n.width ?? undefined,
    height: n.height ?? undefined,
  }));
}

function fromFlowEdges(edges: Edge[]): BoardGraphEdge[] {
  return edges.map((e) => {
    const edge: BoardGraphEdge = {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      type: e.type,
    };
    if (typeof e.label === "string" && e.label.length > 0) {
      edge.label = e.label;
    }
    if (flowEdgeHasArrow(e.markerEnd)) {
      edge.markerEnd = "arrow";
    }
    return edge;
  });
}

function BoardCanvasInner({
  initialNodes,
  initialEdges,
  initialViewport,
  onGraphChange,
  onViewportIdle,
  nodesPerBoard,
  plan,
  onShapeLimitReached,
}: BoardCanvasProps) {
  const { screenToFlowPosition, getViewport } = useReactFlow();
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const cache = useEntityCache();
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(
    toFlowNodes(initialNodes),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    toFlowEdges(initialEdges),
  );
  const [placeKind, setPlaceKind] = useState<PlaceKind | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const lastClickRef = useRef<{ x: number; y: number } | null>(null);
  const onGraphChangeRef = useRef(onGraphChange);
  const skipEmitRef = useRef(true);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    onGraphChangeRef.current = onGraphChange;
  }, [onGraphChange]);

  useEffect(() => {
    if (skipEmitRef.current) {
      skipEmitRef.current = false;
      return;
    }
    onGraphChangeRef.current({
      nodes: fromFlowNodes(nodes),
      edges: fromFlowEdges(edges),
    });
  }, [nodes, edges]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const current = nodesRef.current;
      const graphEdges = edgesRef.current;
      const next = changes.map((change) => {
        if (change.type !== "position" || !change.position) return change;
        const node = current.find((n) => n.id === change.id);
        if (!node) return change;
        const snapped = snapDraggedNodePosition(
          { ...node, position: change.position },
          current,
          graphEdges,
        );
        return { ...change, position: snapped };
      });
      onNodesChangeBase(next);
    },
    [onNodesChangeBase],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge({ ...connection, ...defaultEdgeOptions }, eds),
      );
    },
    [setEdges],
  );

  const dropPosition = useCallback(() => {
    if (lastClickRef.current) return lastClickRef.current;
    const vp = getViewport();
    return (
      screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }) ?? { x: -vp.x / vp.zoom + 200, y: -vp.y / vp.zoom + 160 }
    );
  }, [getViewport, screenToFlowPosition]);

  const addNode = useCallback(
    (type: string, data: Record<string, unknown> = {}) => {
      const limit = nodesPerBoard;
      if (
        limit != null &&
        !isUnlimited(limit) &&
        nodesRef.current.length >= limit
      ) {
        onShapeLimitReached?.(nodesPerBoardLimitMessage(plan, limit));
        return;
      }
      const position = dropPosition();
      const id = crypto.randomUUID();
      setNodes((prev) => [...prev, { id, type, position, data }]);
    },
    [dropPosition, setNodes, nodesPerBoard, plan, onShapeLimitReached],
  );

  const placeEntity = useCallback(
    (kind: EntityLinkKind, entityId: string) => {
      if (kind === "board") return;
      addNode("entityRef", { kind, entityId });
      setPlaceKind(null);
      setPlaceQuery("");
    },
    [addNode],
  );

  const placeStencil = useCallback(
    (stencil: BoardStencil) => {
      addNode("stencil", {
        stencilId: stencil.id,
        icon: stencil.icon,
        label: stencil.label,
        subtitle: "",
      });
    },
    [addNode],
  );

  const onMoveEnd: OnMoveEnd = useCallback(
    (_event, viewport: Viewport) => {
      onViewportIdle({
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom,
      });
    },
    [onViewportIdle],
  );

  const onEdgeDoubleClick = useCallback(
    (_event: unknown, edge: Edge) => {
      setEdges((eds) =>
        eds.map((ed) => {
          if (ed.id === edge.id) {
            return {
              ...ed,
              data: { ...(ed.data as object), editing: true },
            };
          }
          return { ...ed, data: withoutEdgeEditing(ed.data) };
        }),
      );
    },
    [setEdges],
  );

  const selectedColorNode = nodes.find(
    (n) => n.selected && n.type !== "entityRef",
  );
  const selectedColors = (
    selectedColorNode?.data as { colors?: BoardNodeColors } | undefined
  )?.colors;
  const selectedSupportsText =
    selectedColorNode != null &&
    typeof selectedColorNode.type === "string" &&
    TEXT_CAPABLE_NODE_TYPES.has(selectedColorNode.type);
  const selectedNodeData = (selectedColorNode?.data ?? {}) as Record<
    string,
    unknown
  >;
  const selectedShowLabel = selectedNodeData.showLabel !== false;
  const selectedShowSubtitle = selectedNodeData.showSubtitle !== false;
  const selectedTextAnchor: BoardTextAnchor = isBoardTextAnchor(
    selectedNodeData.textAnchor,
  )
    ? selectedNodeData.textAnchor
    : "bottom";
  const selectedEdge = edges.find((e) => e.selected);
  const selectedEdgeHasArrow = selectedEdge
    ? flowEdgeHasArrow(selectedEdge.markerEnd)
    : false;

  function patchSelectedColors(patch: Partial<BoardNodeColors> | null) {
    if (!selectedColorNode) return;
    const targetId = selectedColorNode.id;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== targetId) return n;
        if (patch === null) {
          const { colors: _c, ...rest } = (n.data ?? {}) as Record<
            string,
            unknown
          >;
          void _c;
          return { ...n, data: rest };
        }
        return {
          ...n,
          data: {
            ...n.data,
            colors: {
              ...((n.data?.colors ?? {}) as BoardNodeColors),
              ...patch,
            },
          },
        };
      }),
    );
  }

  function patchSelectedNodeData(patch: Record<string, unknown>) {
    if (!selectedColorNode) return;
    const targetId = selectedColorNode.id;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === targetId ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    );
  }

  function toggleSelectedEdgeArrow() {
    if (!selectedEdge) return;
    const targetId = selectedEdge.id;
    const nextOn = !flowEdgeHasArrow(selectedEdge.markerEnd);
    setEdges((eds) =>
      eds.map((e) =>
        e.id === targetId
          ? { ...e, markerEnd: nextOn ? ARROW_MARKER : undefined }
          : e,
      ),
    );
  }

  const q = placeQuery.trim().toLowerCase();
  const placeItems = (() => {
    if (!placeKind) return [];
    switch (placeKind) {
      case "note":
        return cache.notes
          .filter((n) => !n.deletedAt)
          .filter((n) => !q || n.title.toLowerCase().includes(q))
          .slice(0, 40)
          .map((n) => ({ id: n.id, label: n.title || "Untitled" }));
      case "contact":
        return cache.contacts
          .filter((c) => !c.deletedAt)
          .filter((c) => {
            const name = formatContactName(c).toLowerCase();
            return !q || name.includes(q);
          })
          .slice(0, 40)
          .map((c) => ({
            id: c.id,
            label: formatContactName(c) || "Contact",
          }));
      case "task":
        return cache.tasks
          .filter((t) => !t.deletedAt)
          .filter((t) => !q || t.title.toLowerCase().includes(q))
          .slice(0, 40)
          .map((t) => ({ id: t.id, label: t.title || "Untitled" }));
      case "project":
        return cache.projects
          .filter((p) => !p.deletedAt)
          .filter((p) => !q || p.name.toLowerCase().includes(q))
          .slice(0, 40)
          .map((p) => ({ id: p.id, label: p.name || "Untitled" }));
      default: {
        const _exhaustive: never = placeKind;
        return _exhaustive;
      }
    }
  })();

  return (
    <div className="relative h-full w-full">
      <TooltipProvider delay={300}>
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1">
          {(
            [
              {
                key: "startEvent",
                label: "Start",
                tip: "Begin a flow or process.",
                icon: CircleIcon,
                data: { label: "Start", subtitle: "" },
              },
              {
                key: "endEvent",
                label: "End",
                tip: "Finish a flow or process.",
                icon: CircleIcon,
                data: { label: "End", subtitle: "" },
              },
              {
                key: "bpmnTask",
                label: "Activity",
                tip: "Generic work step. Set an icon and subtitle (e.g. Backend Agent Task), then name the step.",
                icon: SquareIcon,
                data: { label: "Activity", subtitle: "" },
              },
              {
                key: "participant",
                label: "Participant",
                tip: "Person, team, or role in the flow.",
                icon: UsersIcon,
                data: { label: "Role", subtitle: "" },
              },
              {
                key: "exclusiveGateway",
                label: "Gateway",
                tip: "Branch or decide between paths.",
                icon: DiamondIcon,
                data: {},
              },
              {
                key: "annotation",
                label: "Comment",
                tip: "Freeform note on the canvas.",
                icon: MessageSquareIcon,
                data: { text: "Comment" },
              },
            ] as const
          ).map((item) => (
            <Tooltip key={item.key}>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="pointer-events-auto h-7 gap-1 px-2 text-xs shadow-sm"
                    onClick={() => addNode(item.key, { ...item.data })}
                  />
                }
              >
                <item.icon className="size-3.5" />
                {item.label}
              </TooltipTrigger>
              <TooltipContent side="bottom">{item.tip}</TooltipContent>
            </Tooltip>
          ))}
          <BoardStencilLibrary onSelect={placeStencil} />
          <span className="pointer-events-none mx-0.5 self-center text-xs text-muted-foreground">
            ·
          </span>
          {(
            [
              {
                kind: "note" as const,
                label: "Note",
                tip: "Place a linked note on the board.",
                icon: StickyNoteIcon,
              },
              {
                kind: "contact" as const,
                label: "Contact",
                tip: "Place a linked contact on the board.",
                icon: ContactIcon,
              },
              {
                kind: "task" as const,
                label: "Task",
                tip: "Place a linked task on the board.",
                icon: ListTodoIcon,
              },
              {
                kind: "project" as const,
                label: "Project",
                tip: "Place a linked project on the board.",
                icon: FolderKanbanIcon,
              },
            ] as const
          ).map((item) => (
            <Tooltip key={item.kind}>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="pointer-events-auto h-7 gap-1 bg-background/90 px-2 text-xs shadow-sm"
                    onClick={() => {
                      setPlaceKind(item.kind);
                      setPlaceQuery("");
                    }}
                  />
                }
              >
                <item.icon className="size-3.5" />
                {item.label}
              </TooltipTrigger>
              <TooltipContent side="bottom">{item.tip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {selectedColorNode ? (
        <div className="absolute right-3 top-3 z-10 flex max-w-[min(100%-1.5rem,22rem)] flex-wrap items-center gap-2 rounded-md border bg-background/95 px-2 py-1.5 text-[10px] shadow-sm">
          <label className="flex items-center gap-1 text-muted-foreground">
            Border
            <input
              type="color"
              className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
              value={selectedColors?.border ?? "#737373"}
              onChange={(e) => patchSelectedColors({ border: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-1 text-muted-foreground">
            Fill
            <input
              type="color"
              className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
              value={selectedColors?.background ?? "#ffffff"}
              onChange={(e) =>
                patchSelectedColors({ background: e.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-1 text-muted-foreground">
            Text
            <input
              type="color"
              className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
              value={selectedColors?.text ?? "#0a0a0a"}
              onChange={(e) => patchSelectedColors({ text: e.target.value })}
            />
          </label>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="h-6 px-1.5"
            onClick={() => patchSelectedColors(null)}
          >
            Reset
          </Button>
          {selectedSupportsText ? (
            <>
              <span className="text-muted-foreground/50">·</span>
              <label className="flex items-center gap-1 text-muted-foreground">
                <Checkbox
                  checked={selectedShowLabel}
                  onCheckedChange={(checked) =>
                    patchSelectedNodeData({ showLabel: checked === true })
                  }
                />
                Title
              </label>
              <label className="flex items-center gap-1 text-muted-foreground">
                <Checkbox
                  checked={selectedShowSubtitle}
                  onCheckedChange={(checked) =>
                    patchSelectedNodeData({ showSubtitle: checked === true })
                  }
                />
                Subtitle
              </label>
              <div
                className="grid grid-cols-3 gap-0.5"
                role="group"
                aria-label="Text placement"
              >
                {TEXT_ANCHOR_GRID.map((anchor, index) =>
                  anchor == null ? (
                    <span key={`empty-${index}`} className="size-5" aria-hidden />
                  ) : (
                    <button
                      key={anchor}
                      type="button"
                      title={anchor}
                      aria-label={`Place text ${anchor}`}
                      aria-pressed={selectedTextAnchor === anchor}
                      className={cn(
                        "size-5 rounded-sm border",
                        selectedTextAnchor === anchor
                          ? "border-foreground/40 bg-secondary"
                          : "border-transparent hover:bg-muted/70",
                      )}
                      onClick={() =>
                        patchSelectedNodeData({ textAnchor: anchor })
                      }
                    />
                  ),
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : selectedEdge ? (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-md border bg-background/95 px-2 py-1.5 text-[10px] shadow-sm">
          <Button
            type="button"
            size="xs"
            variant={selectedEdgeHasArrow ? "secondary" : "ghost"}
            className="h-6 gap-1 px-1.5"
            aria-pressed={selectedEdgeHasArrow}
            onClick={toggleSelectedEdgeArrow}
          >
            <ArrowRightIcon className="size-3.5" aria-hidden />
            Arrow
          </Button>
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={(e) => {
          lastClickRef.current = screenToFlowPosition({
            x: e.clientX,
            y: e.clientY,
          });
        }}
        onMoveEnd={onMoveEnd}
        nodeTypes={boardNodeTypes}
        edgeTypes={boardEdgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        defaultViewport={initialViewport ?? { x: 0, y: 0, zoom: 1 }}
        fitView={!initialViewport}
        colorMode={colorMode}
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
        className="bg-muted/20"
      >
        <Background gap={18} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      <Dialog
        open={placeKind !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPlaceKind(null);
            setPlaceQuery("");
          }
        }}
      >
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>
              Place {placeKind ? placeKind : "entity"}
            </DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false} className="border-0">
            <CommandInput
              placeholder={`Search ${placeKind ?? ""}…`}
              value={placeQuery}
              onValueChange={setPlaceQuery}
            />
            <CommandList>
              {placeItems.length === 0 ? (
                <CommandEmpty>No matches.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {placeItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        if (placeKind) placeEntity(placeKind, item.id);
                      }}
                    >
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BoardCanvas(props: BoardCanvasProps) {
  return (
    <ReactFlowProvider>
      <BoardCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
