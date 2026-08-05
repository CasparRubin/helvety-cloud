"use client";

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import type { EntityLinkKind } from "@helvety-cloud/api-contract";
import { CircleIcon } from "lucide-react";

import { CategorizationIconPicker } from "@/components/app/categorization-icon-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOptionalEntityCache } from "@/components/unlock/entity-cache";
import {
  BOARD_STENCIL_ICON_COMPONENTS,
  isBoardStencilIcon,
  type BoardStencilIcon,
} from "@/lib/client-crypto/board-stencils";
import {
  CATEGORIZATION_ICON_COMPONENTS,
  isCategorizationIcon,
  type CategorizationIcon,
} from "@/lib/client-crypto/categorization-icons";
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

export type BoardTextAnchor =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const BOARD_TEXT_ANCHORS: readonly BoardTextAnchor[] = [
  "top-left",
  "top",
  "top-right",
  "left",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
] as const;

const TEXT_ANCHOR_CLASS: Record<BoardTextAnchor, string> = {
  top: "left-1/2 bottom-full mb-1 -translate-x-1/2",
  bottom: "left-1/2 top-full mt-1 -translate-x-1/2",
  left: "right-full top-1/2 mr-1 -translate-y-1/2",
  right: "left-full top-1/2 ml-1 -translate-y-1/2",
  "top-left": "right-full bottom-full mr-1 mb-1",
  "top-right": "left-full bottom-full ml-1 mb-1",
  "bottom-left": "right-full top-full mr-1 mt-1",
  "bottom-right": "left-full top-full ml-1 mt-1",
};

type BoardShapeData = {
  label?: string;
  subtitle?: string;
  icon?: CategorizationIcon;
  showLabel: boolean;
  showSubtitle: boolean;
  textAnchor: BoardTextAnchor;
};

type AnnotationData = { text?: string; colors?: BoardNodeColors };
type EntityRefData = {
  kind: EntityLinkKind;
  entityId: string;
};

/** Legacy node types map to Activity with a default icon when none is stored. */
const LEGACY_ACTIVITY_ICON: Record<string, CategorizationIcon> = {
  userTask: "user",
  serviceTask: "bot",
};

export function isBoardTextAnchor(value: unknown): value is BoardTextAnchor {
  return (
    typeof value === "string" &&
    (BOARD_TEXT_ANCHORS as readonly string[]).includes(value)
  );
}

function nodeColorStyle(data: unknown): CSSProperties {
  const colors = (data as { colors?: BoardNodeColors } | null)?.colors;
  if (!colors) return {};
  const style: CSSProperties = {};
  if (colors.border) style.borderColor = colors.border;
  if (colors.background) style.backgroundColor = colors.background;
  if (colors.text) style.color = colors.text;
  return style;
}

function useNodeDataPatch(id: string) {
  const { setNodes } = useReactFlow();
  return (patch: Record<string, unknown>) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    );
  };
}

function readShapeData(data: unknown): BoardShapeData {
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    label: typeof raw.label === "string" ? raw.label : undefined,
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : undefined,
    icon: isCategorizationIcon(raw.icon) ? raw.icon : undefined,
    showLabel: raw.showLabel !== false,
    showSubtitle: raw.showSubtitle !== false,
    textAnchor: isBoardTextAnchor(raw.textAnchor) ? raw.textAnchor : "bottom",
  };
}

function CaptionStack({
  id,
  shape,
  labelFallback,
  labelPlaceholder,
  subtitlePlaceholder,
  textColor,
}: {
  id: string;
  shape: BoardShapeData;
  labelFallback: string;
  labelPlaceholder: string;
  subtitlePlaceholder: string;
  textColor?: string;
}) {
  const patch = useNodeDataPatch(id);
  if (!shape.showLabel && !shape.showSubtitle) return null;

  const side =
    shape.textAnchor === "left" || shape.textAnchor === "right";

  return (
    <div
      className={cn(
        "absolute z-10 flex w-28 flex-col gap-0.5",
        side ? "items-stretch text-left" : "items-center text-center",
        TEXT_ANCHOR_CLASS[shape.textAnchor],
      )}
    >
      {shape.showSubtitle ? (
        <input
          className="nodrag nopan w-full bg-transparent text-[9px] text-muted-foreground outline-none placeholder:text-muted-foreground/60"
          style={textColor ? { color: textColor } : undefined}
          value={shape.subtitle ?? ""}
          placeholder={subtitlePlaceholder}
          onChange={(e) => patch({ subtitle: e.target.value })}
        />
      ) : null}
      {shape.showLabel ? (
        <input
          className="nodrag nopan w-full bg-transparent text-[10px] font-medium outline-none placeholder:text-muted-foreground/70"
          style={textColor ? { color: textColor } : undefined}
          value={shape.label ?? labelFallback}
          placeholder={labelPlaceholder}
          onChange={(e) => patch({ label: e.target.value })}
        />
      ) : null}
    </div>
  );
}

function NodeIconButton({
  icon,
  fallbackIcon,
  color,
  onChange,
}: {
  icon: CategorizationIcon | undefined;
  fallbackIcon?: CategorizationIcon;
  color?: string;
  onChange: (icon: CategorizationIcon | undefined) => void;
}) {
  const display = icon ?? fallbackIcon;
  const Icon = display ? CATEGORIZATION_ICON_COMPONENTS[display] : CircleIcon;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="nodrag nopan inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted/70"
            style={color ? { color } : undefined}
            aria-label="Choose icon"
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <Icon className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-auto max-w-[220px] p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <CategorizationIconPicker value={icon} onChange={onChange} compact />
      </PopoverContent>
    </Popover>
  );
}

function textColorFrom(colors: CSSProperties): string | undefined {
  return typeof colors.color === "string" ? colors.color : undefined;
}

function StartEventNode({ id, data, selected }: NodeProps) {
  const shape = readShapeData(data);
  const colors = nodeColorStyle(data);
  return (
    <div className="group/node relative">
      <div
        className={cn(
          "flex size-12 flex-col items-center justify-center rounded-full border-2 bg-background shadow-sm",
          selected ? "border-primary" : "border-foreground/70",
        )}
        style={colors}
      >
        <NodeHandles />
      </div>
      <CaptionStack
        id={id}
        shape={shape}
        labelFallback="Start"
        labelPlaceholder="Start"
        subtitlePlaceholder="Type"
        textColor={textColorFrom(colors)}
      />
    </div>
  );
}

function EndEventNode({ id, data, selected }: NodeProps) {
  const shape = readShapeData(data);
  const colors = nodeColorStyle(data);
  return (
    <div className="group/node relative">
      <div
        className={cn(
          "flex size-12 flex-col items-center justify-center rounded-full border-[3px] bg-background shadow-sm",
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
            colors.color ? { backgroundColor: colors.color } : undefined
          }
        />
        <NodeHandles />
      </div>
      <CaptionStack
        id={id}
        shape={shape}
        labelFallback="End"
        labelPlaceholder="End"
        subtitlePlaceholder="Type"
        textColor={textColorFrom(colors)}
      />
    </div>
  );
}

function ActivityNode({ id, data, selected, type }: NodeProps) {
  const shape = readShapeData(data);
  const patch = useNodeDataPatch(id);
  const colors = nodeColorStyle(data);
  const textColor = textColorFrom(colors);
  const icon =
    shape.icon ??
    (typeof type === "string" ? LEGACY_ACTIVITY_ICON[type] : undefined);

  return (
    <div className="group/node relative">
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-lg border bg-background shadow-sm",
          selected ? "border-primary ring-1 ring-primary/30" : "border-border",
        )}
        style={colors}
      >
        <NodeHandles />
        <NodeIconButton
          icon={icon}
          color={textColor}
          onChange={(next) => patch({ icon: next })}
        />
      </div>
      <CaptionStack
        id={id}
        shape={shape}
        labelFallback="Activity"
        labelPlaceholder="Name"
        subtitlePlaceholder="Type"
        textColor={textColor}
      />
    </div>
  );
}

function ParticipantNode({ id, data, selected }: NodeProps) {
  const shape = readShapeData(data);
  const patch = useNodeDataPatch(id);
  const colors = nodeColorStyle(data);
  const textColor = textColorFrom(colors);

  return (
    <div className="group/node relative">
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-full border bg-background shadow-sm",
          selected ? "border-primary ring-1 ring-primary/30" : "border-border",
        )}
        style={colors}
      >
        <NodeHandles />
        <NodeIconButton
          icon={shape.icon}
          fallbackIcon="user"
          color={textColor}
          onChange={(next) => patch({ icon: next })}
        />
      </div>
      <CaptionStack
        id={id}
        shape={shape}
        labelFallback="Role"
        labelPlaceholder="Name"
        subtitlePlaceholder="Type"
        textColor={textColor}
      />
    </div>
  );
}

function ExclusiveGatewayNode({ id, data, selected }: NodeProps) {
  const shape = readShapeData(data);
  const colors = nodeColorStyle(data);
  return (
    <div className="group/node relative">
      <div className="relative flex size-14 items-center justify-center">
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
      <CaptionStack
        id={id}
        shape={shape}
        labelFallback=""
        labelPlaceholder="Decision"
        subtitlePlaceholder="Type"
        textColor={textColorFrom(colors)}
      />
    </div>
  );
}

function AnnotationNode({ id, data, selected }: NodeProps) {
  const patch = useNodeDataPatch(id);
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
        onChange={(e) => patch({ text: e.target.value })}
      />
    </div>
  );
}

function StencilNode({ id, data, selected }: NodeProps) {
  const shape = readShapeData(data);
  const colors = nodeColorStyle(data);
  const textColor = textColorFrom(colors);
  const raw = (data ?? {}) as Record<string, unknown>;
  const iconToken: BoardStencilIcon | undefined = isBoardStencilIcon(raw.icon)
    ? raw.icon
    : undefined;
  const Icon = iconToken
    ? BOARD_STENCIL_ICON_COMPONENTS[iconToken]
    : CircleIcon;

  return (
    <div className="group/node relative">
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-xl border bg-background shadow-sm",
          selected ? "border-primary ring-1 ring-primary/30" : "border-border",
        )}
        style={colors}
      >
        <NodeHandles />
        <Icon
          className="size-6 shrink-0 text-muted-foreground"
          style={textColor ? { color: textColor } : undefined}
          aria-hidden
        />
      </div>
      <CaptionStack
        id={id}
        shape={shape}
        labelFallback={shape.label || "Stencil"}
        labelPlaceholder="Name"
        subtitlePlaceholder="Type"
        textColor={textColor}
      />
    </div>
  );
}

function EntityRefNode({ data, selected }: NodeProps) {
  const router = useRouter();
  const cache = useOptionalEntityCache();
  const ref = data as EntityRefData;
  const resolved = cache?.resolve(ref.kind, ref.entityId);
  const color = resolved?.color ?? KIND_FALLBACK_COLOR[ref.kind];
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
  bpmnTask: ActivityNode,
  userTask: ActivityNode,
  serviceTask: ActivityNode,
  participant: ParticipantNode,
  exclusiveGateway: ExclusiveGatewayNode,
  annotation: AnnotationNode,
  stencil: StencilNode,
  entityRef: EntityRefNode,
};
