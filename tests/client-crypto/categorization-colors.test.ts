import { describe, expect, it } from "vitest";

import {
  defaultCategorizations,
  resolveStageColor,
} from "../../apps/web/lib/client-crypto/categorizations";

describe("categorization colors", () => {
  it("seeds default labels and priorities with accent colors", () => {
    const cats = defaultCategorizations();
    const labelByName = Object.fromEntries(cats.labels.map((s) => [s.name, s.color]));
    const priorityByName = Object.fromEntries(
      cats.priorities.map((s) => [s.name, s.color]),
    );

    expect(labelByName.Bug).toBe("violet");
    expect(labelByName["Change Request"]).toBe("teal");
    expect(labelByName["Clean-up"]).toBe("slate");
    expect(labelByName.Documentation).toBe("amber");
    expect(labelByName.Enhancement).toBe("green");
    expect(labelByName.Maintenance).toBe("orange");
    expect(labelByName["New Feature"]).toBe("blue");

    expect(priorityByName.Low).toBe("slate");
    expect(priorityByName.Normal).toBe("amber");
    expect(priorityByName.High).toBe("orange");
    expect(priorityByName.Urgent).toBe("red");
  });

  it("seeds default labels in alphabetical order", () => {
    const names = defaultCategorizations().labels.map((l) => l.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("seeds default stages with EntityColor tokens", () => {
    const cats = defaultCategorizations();
    const byName = Object.fromEntries(
      cats.stages.map((s) => [s.name, s.color]),
    );
    expect(byName.Backlog).toBe("slate");
    expect(byName["In Progress"]).toBe("teal");
    expect(byName.Completed).toBe("green");
    expect(byName.Cancelled).toBe("red");
  });

  it("resolveStageColor prefers stored color then name map", () => {
    expect(resolveStageColor({ name: "custom", color: "pink" })).toBe("pink");
    expect(resolveStageColor({ name: "In Progress" })).toBe("teal");
    expect(resolveStageColor({ name: "unknown-stage" })).toBeUndefined();
  });
});
