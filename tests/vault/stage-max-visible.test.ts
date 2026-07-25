import { describe, expect, it } from "vitest";

import {
  cloneCategorizations,
  DEFAULT_MAX_VISIBLE_TASKS,
  defaultCategorizations,
  normalizeMaxVisibleTasks,
  parseCategorizations,
  resolveMaxVisibleTasks,
} from "../../apps/web/lib/vault/categorizations";

describe("stage maxVisibleTasks", () => {
  it("seeds all stages at the default limit", () => {
    const cats = defaultCategorizations();
    for (const stage of cats.stages) {
      expect(stage.maxVisibleTasks).toBe(DEFAULT_MAX_VISIBLE_TASKS);
    }
  });

  it("parses positive integers, ignores invalid and legacy collapse", () => {
    const parsed = parseCategorizations({
      labels: [],
      stages: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Backlog",
          sortOrder: 0,
          isDefault: true,
          maxVisibleTasks: 5,
          collapsedByDefault: true,
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          name: "Ready",
          sortOrder: 1,
        },
        {
          id: "66666666-6666-4666-8666-666666666666",
          name: "Discovery",
          sortOrder: 3,
          maxVisibleTasks: 0,
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          name: "Cancelled",
          sortOrder: 2,
          maxVisibleTasks: "15",
        },
      ],
      priorities: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          name: "Normal",
          sortOrder: 0,
          isDefault: true,
        },
      ],
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.stages[0]!.maxVisibleTasks).toBe(5);
    expect(parsed!.stages[0]).not.toHaveProperty("collapsedByDefault");
    expect(parsed!.stages[1]!.maxVisibleTasks).toBeUndefined();
    expect(parsed!.stages[2]!.maxVisibleTasks).toBeUndefined();
    expect(parsed!.stages[3]!.maxVisibleTasks).toBeUndefined();
  });

  it("resolves missing or invalid values to the default", () => {
    expect(resolveMaxVisibleTasks(undefined)).toBe(DEFAULT_MAX_VISIBLE_TASKS);
    expect(resolveMaxVisibleTasks({})).toBe(DEFAULT_MAX_VISIBLE_TASKS);
    expect(resolveMaxVisibleTasks({ maxVisibleTasks: 5 })).toBe(5);
    expect(resolveMaxVisibleTasks({ maxVisibleTasks: 0 })).toBe(
      DEFAULT_MAX_VISIBLE_TASKS,
    );
  });

  it("normalizes only integers in range", () => {
    expect(normalizeMaxVisibleTasks(15)).toBe(15);
    expect(normalizeMaxVisibleTasks(1)).toBe(1);
    expect(normalizeMaxVisibleTasks(500)).toBe(500);
    expect(normalizeMaxVisibleTasks(0)).toBeNull();
    expect(normalizeMaxVisibleTasks(501)).toBeNull();
    expect(normalizeMaxVisibleTasks(1.5)).toBeNull();
    expect(normalizeMaxVisibleTasks("15")).toBeNull();
  });

  it("preserves maxVisibleTasks when cloning", () => {
    const source = defaultCategorizations();
    source.stages[0]!.maxVisibleTasks = 5;
    const cloned = cloneCategorizations(source);
    for (const stage of source.stages) {
      const match = cloned.stages.find((s) => s.name === stage.name);
      expect(match).toBeDefined();
      expect(match!.id).not.toBe(stage.id);
      expect(match!.maxVisibleTasks).toBe(stage.maxVisibleTasks);
    }
  });
});
