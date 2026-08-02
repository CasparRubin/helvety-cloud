import { describe, expect, it } from "vitest";

import { snapDraggedNodePosition } from "../../apps/web/lib/client-crypto/board-edge-snap";

describe("snapDraggedNodePosition", () => {
  const start = {
    id: "start",
    type: "startEvent",
    position: { x: 0, y: 0 },
    width: 48,
    height: 48,
  };
  const comment = {
    id: "comment",
    type: "annotation",
    position: { x: 200, y: 0 },
    width: 140,
    height: 56,
  };

  it("snaps Y for a near-horizontal Right→Left edge", () => {
    const edges = [
      {
        source: "start",
        target: "comment",
        sourceHandle: null,
        targetHandle: null,
      },
    ];
    const snapped = snapDraggedNodePosition(comment, [start, comment], edges);
    expect(snapped.x).toBe(200);
    expect(snapped.y).toBe(-4);
  });

  it("does not snap when outside threshold", () => {
    const far = { ...comment, position: { x: 200, y: 40 } };
    const edges = [
      {
        source: "start",
        target: "comment",
        sourceHandle: null,
        targetHandle: null,
      },
    ];
    expect(snapDraggedNodePosition(far, [start, far], edges)).toEqual({
      x: 200,
      y: 40,
    });
  });

  it("snaps X for a near-vertical Bottom→Top edge", () => {
    const above = {
      id: "above",
      type: "bpmnTask",
      position: { x: 100, y: 0 },
      width: 40,
      height: 40,
    };
    const nearBelow = {
      id: "below",
      type: "endEvent",
      position: { x: 96, y: 120 },
      width: 48,
      height: 48,
    };
    const edges = [
      {
        source: "below",
        target: "above",
        sourceHandle: "b",
        targetHandle: "t",
      },
    ];
    const snapped = snapDraggedNodePosition(
      nearBelow,
      [above, nearBelow],
      edges,
    );
    // Peer top-center x = 100 + 20 = 120; below width 48 → desired x = 96
    expect(snapped.x).toBe(96);
    expect(snapped.y).toBe(120);
  });

  it("prefers the nearer peer when multiple horizontal edges compete", () => {
    const a = {
      id: "a",
      type: "startEvent",
      position: { x: 0, y: 0 },
      width: 48,
      height: 48,
    };
    const b = {
      id: "b",
      type: "startEvent",
      position: { x: 0, y: 20 },
      width: 48,
      height: 48,
    };
    const dragged = {
      id: "d",
      type: "annotation",
      position: { x: 200, y: 2 },
      width: 140,
      height: 56,
    };
    const edges = [
      { source: "a", target: "d", sourceHandle: null, targetHandle: null },
      { source: "b", target: "d", sourceHandle: null, targetHandle: null },
    ];
    expect(
      snapDraggedNodePosition(dragged, [a, b, dragged], edges).y,
    ).toBe(-4);
  });
});
