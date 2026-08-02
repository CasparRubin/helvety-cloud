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
  BotIcon,
  CircleIcon,
  DiamondIcon,
  FolderKanbanIcon,
  MessageSquareIcon,
  ContactIcon,
  ListTodoIcon,
  StickyNoteIcon,
  SquareIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EntityLinkKind } from "@helvety-cloud/api-contract";

import { boardEdgeTypes, withoutEdgeEditing } from "@/components/app/board-edge";
import { boardNodeTypes, type BoardNodeColors } from "@/components/app/board-nodes";
import { useEntityCache } from "@/components/unlock/entity-cache";
import { Button } from "@/components/ui/button";
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
import { snapDraggedNodePosition } from "@/lib/client-crypto/board-edge-snap";
import { formatContactName } from "@/lib/client-crypto/contact-plaintext";
import type {
  BoardGraphEdge,
  BoardGraphNode,
  BoardViewport,
} from "@/lib/client-crypto/board-plaintext";

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
};

type PlaceKind = "note" | "contact" | "task" | "project";

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
};

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
    markerEnd: defaultEdgeOptions.markerEnd,
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
    return edge;
  });
}

function BoardCanvasInner({
  initialNodes,
  initialEdges,
  initialViewport,
  onGraphChange,
  onViewportIdle,
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
      const position = dropPosition();
      const id = crypto.randomUUID();
      setNodes((prev) => [...prev, { id, type, position, data }]);
    },
    [dropPosition, setNodes],
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
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1">
        {(
          [
            {
              key: "startEvent",
              label: "Start",
              icon: CircleIcon,
              data: { label: "Start" },
            },
            {
              key: "endEvent",
              label: "End",
              icon: CircleIcon,
              data: { label: "End" },
            },
            {
              key: "bpmnTask",
              label: "Activity",
              icon: SquareIcon,
              data: { label: "Task" },
            },
            {
              key: "userTask",
              label: "User task",
              icon: UserIcon,
              data: { label: "User task" },
            },
            {
              key: "serviceTask",
              label: "Service",
              icon: BotIcon,
              data: { label: "Service" },
            },
            {
              key: "participant",
              label: "Participant",
              icon: UsersIcon,
              data: { label: "Role" },
            },
            {
              key: "exclusiveGateway",
              label: "Gateway",
              icon: DiamondIcon,
              data: {},
            },
            {
              key: "annotation",
              label: "Comment",
              icon: MessageSquareIcon,
              data: { text: "Comment" },
            },
          ] as const
        ).map((item) => (
          <Button
            key={item.key}
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto h-7 gap-1 px-2 text-xs shadow-sm"
            onClick={() => addNode(item.key, { ...item.data })}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </Button>
        ))}
        <span className="pointer-events-none mx-0.5 self-center text-xs text-muted-foreground">
          ·
        </span>
        {(
          [
            { kind: "note" as const, label: "Note", icon: StickyNoteIcon },
            { kind: "contact" as const, label: "Contact", icon: ContactIcon },
            { kind: "task" as const, label: "Task", icon: ListTodoIcon },
            {
              kind: "project" as const,
              label: "Project",
              icon: FolderKanbanIcon,
            },
          ] as const
        ).map((item) => (
          <Button
            key={item.kind}
            type="button"
            size="sm"
            variant="outline"
            className="pointer-events-auto h-7 gap-1 bg-background/90 px-2 text-xs shadow-sm"
            onClick={() => {
              setPlaceKind(item.kind);
              setPlaceQuery("");
            }}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </Button>
        ))}
      </div>

      {selectedColorNode ? (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-md border bg-background/95 px-2 py-1.5 text-[10px] shadow-sm">
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
