"use client";

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { useRouter } from "next/navigation";
import type { EntityLinkKind } from "@helvety-cloud/api-contract";

import { useOptionalEntityCache } from "@/components/unlock/entity-cache";
import {
  ENTITY_COLOR_CLASSES,
  KIND_FALLBACK_COLOR,
} from "@/lib/client-crypto/entity-colors";
import { cn } from "@/lib/utils";

const handleClass =
  "!size-2 !border-border !bg-background !opacity-0 group-hover/node:!opacity-100 transition-opacity";

function NodeHandles() {
  return (
    <>
      <Handle type="target" position={Position.Left} className={handleClass} />
      <Handle type="source" position={Position.Right} className={handleClass} />
      <Handle type="target" position={Position.Top} id="t" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="b" className={handleClass} />
    </>
  );
}

type BpmnLabelData = { label?: string };
type AnnotationData = { text?: string };
type EntityRefData = {
  kind: EntityLinkKind;
  entityId: string;
};

function StartEventNode({ data, selected }: NodeProps) {
  const label = (data as BpmnLabelData).label ?? "Start";
  return (
    <div
      className={cn(
        "group/node flex size-12 flex-col items-center justify-center rounded-full border-2 bg-background shadow-sm",
        selected ? "border-primary" : "border-foreground/70",
      )}
    >
      <NodeHandles />
      <span className="pointer-events-none absolute top-full mt-1 max-w-24 truncate text-[10px] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function EndEventNode({ data, selected }: NodeProps) {
  const label = (data as BpmnLabelData).label ?? "End";
  return (
    <div
      className={cn(
        "group/node flex size-12 flex-col items-center justify-center rounded-full border-[3px] bg-background shadow-sm",
        selected ? "border-primary" : "border-foreground",
      )}
    >
      <div
        className={cn(
          "size-7 rounded-full",
          selected ? "bg-primary/80" : "bg-foreground",
        )}
      />
      <NodeHandles />
      <span className="pointer-events-none absolute top-full mt-1 max-w-24 truncate text-[10px] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function BpmnTaskNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow();
  const label = (data as BpmnLabelData).label ?? "Task";
  return (
    <div
      className={cn(
        "group/node min-w-[120px] max-w-[180px] rounded-lg border bg-background px-3 py-2 text-center text-xs shadow-sm",
        selected ? "border-primary ring-1 ring-primary/30" : "border-border",
      )}
    >
      <NodeHandles />
      <input
        className="nodrag nopan w-full bg-transparent text-center outline-none"
        value={label}
        onChange={(e) => {
          const next = e.target.value;
          setNodes((nodes) =>
            nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, label: next } } : n,
            ),
          );
        }}
      />
    </div>
  );
}

function ExclusiveGatewayNode({ selected }: NodeProps) {
  return (
    <div className="group/node relative flex size-14 items-center justify-center">
      <div
        className={cn(
          "size-10 rotate-45 border bg-background shadow-sm",
          selected ? "border-primary" : "border-foreground/70",
        )}
      />
      <span className="pointer-events-none absolute text-sm font-medium text-foreground">
        ×
      </span>
      <NodeHandles />
    </div>
  );
}

function AnnotationNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow();
  const text = (data as AnnotationData).text ?? "";
  return (
    <div
      className={cn(
        "group/node min-w-[140px] max-w-[220px] rounded-md border border-dashed bg-amber-500/10 px-2.5 py-2 text-xs shadow-sm",
        selected ? "border-primary" : "border-amber-600/40",
      )}
    >
      <NodeHandles />
      <textarea
        className="nodrag nopan nowheel field-sizing-content w-full resize-none bg-transparent text-foreground/90 outline-none placeholder:text-muted-foreground"
        rows={2}
        value={text}
        placeholder="Comment"
        onChange={(e) => {
          const next = e.target.value;
          setNodes((nodes) =>
            nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, text: next } } : n,
            ),
          );
        }}
      />
    </div>
  );
}

function EntityRefNode({ data, selected }: NodeProps) {
  const router = useRouter();
  const cache = useOptionalEntityCache();
  const ref = data as EntityRefData;
  const resolved = cache?.resolve(ref.kind, ref.entityId);
  const color =
    resolved?.color ??
    KIND_FALLBACK_COLOR[ref.kind === "board" ? "note" : ref.kind];
  const classes = ENTITY_COLOR_CLASSES[color];
  const label = resolved?.label ?? "Unavailable";
  const href = resolved?.href;

  return (
    <button
      type="button"
      className={cn(
        "group/node min-w-[140px] max-w-[200px] rounded-md px-2.5 py-1.5 text-left text-xs font-medium shadow-sm ring-1 ring-inset",
        classes.bg,
        classes.text,
        classes.ring,
        selected && "ring-2 ring-primary",
      )}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (href) router.push(href);
      }}
      title={href ? "Double-click to open" : undefined}
    >
      <NodeHandles />
      <span className="block truncate capitalize opacity-70">{ref.kind}</span>
      <span className="block truncate">{label}</span>
    </button>
  );
}

export const boardNodeTypes = {
  startEvent: StartEventNode,
  endEvent: EndEventNode,
  bpmnTask: BpmnTaskNode,
  exclusiveGateway: ExclusiveGatewayNode,
  annotation: AnnotationNode,
  entityRef: EntityRefNode,
};
