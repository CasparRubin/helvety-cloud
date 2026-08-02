"use client";

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { BotIcon, UserIcon, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
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

export type BoardNodeColors = {
  border?: string;
  background?: string;
  text?: string;
};

type BpmnLabelData = { label?: string; colors?: BoardNodeColors };
type AnnotationData = { text?: string; colors?: BoardNodeColors };
type EntityRefData = {
  kind: EntityLinkKind;
  entityId: string;
};

export function nodeColorStyle(data: unknown): CSSProperties {
  const colors = (data as { colors?: BoardNodeColors } | null)?.colors;
  if (!colors) return {};
  const style: CSSProperties = {};
  if (colors.border) style.borderColor = colors.border;
  if (colors.background) style.backgroundColor = colors.background;
  if (colors.text) style.color = colors.text;
  return style;
}

function useLabelEdit(id: string) {
  const { setNodes } = useReactFlow();
  return (next: string) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label: next } } : n,
      ),
    );
  };
}

function StartEventNode({ data, selected }: NodeProps) {
  const label = (data as BpmnLabelData).label ?? "Start";
  const colors = nodeColorStyle(data);
  return (
    <div
      className={cn(
        "group/node flex size-12 flex-col items-center justify-center rounded-full border-2 bg-background shadow-sm",
        selected ? "border-primary" : "border-foreground/70",
      )}
      style={colors}
    >
      <NodeHandles />
      <span
        className="pointer-events-none absolute top-full mt-1 max-w-24 truncate text-[10px] text-muted-foreground"
        style={colors.color ? { color: colors.color } : undefined}
      >
        {label}
      </span>
    </div>
  );
}

function EndEventNode({ data, selected }: NodeProps) {
  const label = (data as BpmnLabelData).label ?? "End";
  const colors = nodeColorStyle(data);
  return (
    <div
      className={cn(
        "group/node flex size-12 flex-col items-center justify-center rounded-full border-[3px] bg-background shadow-sm",
        selected ? "border-primary" : "border-foreground",
      )}
      style={colors}
    >
      <div
        className={cn(
          "size-7 rounded-full",
          selected ? "bg-primary/80" : "bg-foreground",
        )}
        style={
          colors.color
            ? { backgroundColor: colors.color }
            : undefined
        }
      />
      <NodeHandles />
      <span
        className="pointer-events-none absolute top-full mt-1 max-w-24 truncate text-[10px] text-muted-foreground"
        style={colors.color ? { color: colors.color } : undefined}
      >
        {label}
      </span>
    </div>
  );
}

function BpmnTaskNode({ id, data, selected }: NodeProps) {
  const label = (data as BpmnLabelData).label ?? "Task";
  const setLabel = useLabelEdit(id);
  const colors = nodeColorStyle(data);
  return (
    <div
      className={cn(
        "group/node min-w-[120px] max-w-[180px] rounded-lg border bg-background px-3 py-2 text-center text-xs shadow-sm",
        selected ? "border-primary ring-1 ring-primary/30" : "border-border",
      )}
      style={colors}
    >
      <NodeHandles />
      <input
        className="nodrag nopan w-full bg-transparent text-center outline-none"
        style={colors.color ? { color: colors.color } : undefined}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
    </div>
  );
}

function createMarkedTask(Marker: LucideIcon, fallbackLabel: string) {
  return function MarkedTaskNode({ id, data, selected }: NodeProps) {
    const label = (data as BpmnLabelData).label ?? fallbackLabel;
    const setLabel = useLabelEdit(id);
    const colors = nodeColorStyle(data);
    return (
      <div
        className={cn(
          "group/node relative min-w-[120px] max-w-[180px] rounded-lg border bg-background px-3 pb-2 pt-5 text-center text-xs shadow-sm",
          selected ? "border-primary ring-1 ring-primary/30" : "border-border",
        )}
        style={colors}
      >
        <NodeHandles />
        <Marker
          className="pointer-events-none absolute left-2 top-1.5 size-3 text-muted-foreground"
          style={colors.color ? { color: colors.color } : undefined}
          aria-hidden
        />
        <input
          className="nodrag nopan w-full bg-transparent text-center outline-none"
          style={colors.color ? { color: colors.color } : undefined}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
    );
  };
}

const UserTaskNode = createMarkedTask(UserIcon, "User task");
const ServiceTaskNode = createMarkedTask(BotIcon, "Service");

function ParticipantNode({ id, data, selected }: NodeProps) {
  const label = (data as BpmnLabelData).label ?? "Role";
  const setLabel = useLabelEdit(id);
  const colors = nodeColorStyle(data);
  return (
    <div
      className={cn(
        "group/node flex min-w-[140px] max-w-[200px] items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs shadow-sm",
        selected ? "border-primary ring-1 ring-primary/30" : "border-border",
      )}
      style={colors}
    >
      <NodeHandles />
      <UserIcon
        className="size-3.5 shrink-0 text-muted-foreground"
        style={colors.color ? { color: colors.color } : undefined}
        aria-hidden
      />
      <input
        className="nodrag nopan min-w-0 flex-1 bg-transparent outline-none"
        style={colors.color ? { color: colors.color } : undefined}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
    </div>
  );
}

function ExclusiveGatewayNode({ data, selected }: NodeProps) {
  const colors = nodeColorStyle(data);
  return (
    <div className="group/node relative flex size-14 items-center justify-center">
      <div
        className={cn(
          "size-10 rotate-45 border bg-background shadow-sm",
          selected ? "border-primary" : "border-foreground/70",
        )}
        style={colors}
      />
      <span
        className="pointer-events-none absolute text-sm font-medium text-foreground"
        style={colors.color ? { color: colors.color } : undefined}
      >
        ×
      </span>
      <NodeHandles />
    </div>
  );
}

function AnnotationNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow();
  const text = (data as AnnotationData).text ?? "";
  const colors = nodeColorStyle(data);
  return (
    <div
      className={cn(
        "group/node min-w-[140px] max-w-[220px] rounded-md border border-dashed bg-amber-500/10 px-2.5 py-2 text-xs shadow-sm",
        selected ? "border-primary" : "border-amber-600/40",
      )}
      style={colors}
    >
      <NodeHandles />
      <textarea
        className="nodrag nopan nowheel field-sizing-content w-full resize-none bg-transparent text-foreground/90 outline-none placeholder:text-muted-foreground"
        style={colors.color ? { color: colors.color } : undefined}
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
  userTask: UserTaskNode,
  serviceTask: ServiceTaskNode,
  participant: ParticipantNode,
  exclusiveGateway: ExclusiveGatewayNode,
  annotation: AnnotationNode,
  entityRef: EntityRefNode,
};
