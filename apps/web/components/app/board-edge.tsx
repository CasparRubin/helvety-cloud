"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

export type BoardEdgeData = {
  editing?: boolean;
};

/** Drop transient `editing` flag; return undefined when data is empty. */
export function withoutEdgeEditing(
  data: unknown,
): Record<string, unknown> | undefined {
  if (!data || typeof data !== "object") return undefined;
  const { editing: _editing, ...rest } = data as Record<string, unknown>;
  void _editing;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

function EdgeLabelEditor({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      className="min-w-[2.5rem] max-w-[10rem] rounded border border-border bg-background px-1.5 py-0.5 text-center text-[10px] shadow-sm outline-none focus:border-ring"
      value={draft}
      placeholder="Label"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(draft);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
    />
  );
}

export function BoardLabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
  data,
  selected,
}: EdgeProps<Edge<BoardEdgeData>>) {
  const { setEdges } = useReactFlow();
  const editing = Boolean(data?.editing);
  const savedLabel = typeof label === "string" ? label : "";

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  function commit(next: string) {
    const trimmed = next.trim();
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== id) return e;
        return {
          ...e,
          label: trimmed.length > 0 ? trimmed : undefined,
          data: withoutEdgeEditing(e.data),
        };
      }),
    );
  }

  function cancel() {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === id ? { ...e, data: withoutEdgeEditing(e.data) } : e,
      ),
    );
  }

  const showLabel = editing || savedLabel.length > 0;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={24}
      />
      {showLabel ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            {editing ? (
              <EdgeLabelEditor
                key={`${id}-edit`}
                initial={savedLabel}
                onCommit={commit}
                onCancel={cancel}
              />
            ) : (
              <span
                className={`rounded border border-border bg-background px-1.5 py-0.5 text-[10px] shadow-sm ${
                  selected ? "ring-1 ring-primary/40" : ""
                }`}
              >
                {savedLabel}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const boardEdgeTypes = {
  smoothstep: BoardLabeledEdge,
};
