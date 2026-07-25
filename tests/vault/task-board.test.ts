import { describe, expect, it } from "vitest";

import { defaultCategorizations } from "../../apps/web/lib/vault/categorizations";
import { groupTasksByStage } from "../../apps/web/lib/vault/task-board";

describe("task-board grouping", () => {
  it("preserves every stage column even when empty", () => {
    const cats = defaultCategorizations();
    const columns = groupTasksByStage([], cats);
    expect(columns).toHaveLength(cats.stages.length);
    expect(columns.every((c) => c.tasks.length === 0)).toBe(true);
    expect(columns.map((c) => c.stage.name)).toEqual(
      [...cats.stages]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
        .map((s) => s.name),
    );
  });

  it("orders columns by stage sortOrder", () => {
    const cats = defaultCategorizations();
    const backlog = cats.stages.find((s) => s.name === "Backlog")!;
    const completed = cats.stages.find((s) => s.name === "Completed")!;
    const columns = groupTasksByStage(
      [
        {
          id: "t1",
          stageId: completed.id,
          priorityId: cats.priorities[0]!.id,
          sortOrder: 0,
        },
        {
          id: "t2",
          stageId: backlog.id,
          priorityId: cats.priorities[0]!.id,
          sortOrder: 1,
        },
      ],
      cats,
    );
    expect(columns[0]!.stage.name).toBe("Backlog");
    expect(columns[0]!.tasks.map((t) => t.id)).toEqual(["t2"]);
    expect(columns.at(-2)!.stage.name).toBe("Completed");
    expect(columns.at(-2)!.tasks.map((t) => t.id)).toEqual(["t1"]);
  });

  it("sorts highest priority first within a stage", () => {
    const cats = defaultCategorizations();
    const stage = cats.stages.find((s) => s.name === "Backlog")!;
    const low = cats.priorities.find((p) => p.name === "Low")!;
    const normal = cats.priorities.find((p) => p.name === "Normal")!;
    const urgent = cats.priorities.find((p) => p.name === "Urgent")!;
    const columns = groupTasksByStage(
      [
        { id: "a", stageId: stage.id, priorityId: low.id, sortOrder: 0 },
        { id: "b", stageId: stage.id, priorityId: urgent.id, sortOrder: 1 },
        { id: "c", stageId: stage.id, priorityId: normal.id, sortOrder: 2 },
      ],
      cats,
    );
    expect(columns[0]!.tasks.map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks priority ties by sortOrder then id", () => {
    const cats = defaultCategorizations();
    const stage = cats.stages[0]!;
    const high = cats.priorities.find((p) => p.name === "High")!;
    const columns = groupTasksByStage(
      [
        { id: "z", stageId: stage.id, priorityId: high.id, sortOrder: 2 },
        { id: "a", stageId: stage.id, priorityId: high.id, sortOrder: 1 },
        { id: "m", stageId: stage.id, priorityId: high.id, sortOrder: 1 },
      ],
      cats,
    );
    expect(columns[0]!.tasks.map((t) => t.id)).toEqual(["a", "m", "z"]);
  });

  it("maps stale stage ids to the default stage", () => {
    const cats = defaultCategorizations();
    const defaultId = cats.stages.find((s) => s.isDefault)!.id;
    const columns = groupTasksByStage(
      [
        {
          id: "t1",
          stageId: "missing",
          priorityId: cats.priorities[0]!.id,
          sortOrder: 0,
        },
        {
          id: "t2",
          stageId: null,
          priorityId: cats.priorities[0]!.id,
          sortOrder: 1,
        },
      ],
      cats,
    );
    const defaultCol = columns.find((c) => c.stage.id === defaultId)!;
    expect(defaultCol.tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("ranks unknown priorities below known ones", () => {
    const cats = defaultCategorizations();
    const stage = cats.stages[0]!;
    const low = cats.priorities.find((p) => p.name === "Low")!;
    const columns = groupTasksByStage(
      [
        { id: "known", stageId: stage.id, priorityId: low.id, sortOrder: 0 },
        {
          id: "unknown",
          stageId: stage.id,
          priorityId: "missing",
          sortOrder: 0,
        },
      ],
      cats,
    );
    expect(columns[0]!.tasks.map((t) => t.id)).toEqual(["known", "unknown"]);
  });
});
