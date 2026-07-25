import { describe, expect, it } from "vitest";

import {
  cloneCategorizations,
  defaultCategorizations,
  parseCategorizations,
  resolveStageCollapsedByDefault,
} from "../../apps/web/lib/vault/categorizations";

describe("stage collapsedByDefault", () => {
  it("seeds backlog and cancelled collapsed", () => {
    const cats = defaultCategorizations();
    const byName = Object.fromEntries(
      cats.stages.map((s) => [s.name, s.collapsedByDefault === true]),
    );
    expect(byName.backlog).toBe(true);
    expect(byName.cancelled).toBe(true);
    expect(byName.discovery).toBe(false);
    expect(byName.ready).toBe(false);
    expect(byName["in progress"]).toBe(false);
    expect(byName.testing).toBe(false);
    expect(byName.acceptance).toBe(false);
    expect(byName.completed).toBe(false);
  });

  it("falls back to the stage name when the flag is unset", () => {
    expect(resolveStageCollapsedByDefault({ name: "Backlog" })).toBe(true);
    expect(resolveStageCollapsedByDefault({ name: "cancelled" })).toBe(true);
    expect(resolveStageCollapsedByDefault({ name: "ready" })).toBe(false);
    expect(resolveStageCollapsedByDefault({ name: "custom stage" })).toBe(
      false,
    );
  });

  it("prefers an explicit flag over the stage name fallback", () => {
    expect(
      resolveStageCollapsedByDefault({
        name: "backlog",
        collapsedByDefault: false,
      }),
    ).toBe(false);
    expect(
      resolveStageCollapsedByDefault({
        name: "ready",
        collapsedByDefault: true,
      }),
    ).toBe(true);
  });

  it("parses booleans, ignores invalid, and treats missing as unset", () => {
    const parsed = parseCategorizations({
      labels: [],
      stages: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "backlog",
          sortOrder: 0,
          isDefault: true,
          collapsedByDefault: true,
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          name: "ready",
          sortOrder: 1,
        },
        {
          id: "66666666-6666-4666-8666-666666666666",
          name: "discovery",
          sortOrder: 3,
          collapsedByDefault: false,
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          name: "cancelled",
          sortOrder: 2,
          collapsedByDefault: "yes",
        },
      ],
      priorities: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          name: "normal",
          sortOrder: 0,
          isDefault: true,
        },
      ],
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.stages[0]!.collapsedByDefault).toBe(true);
    expect(parsed!.stages[1]!.collapsedByDefault).toBeUndefined();
    expect(parsed!.stages[2]!.collapsedByDefault).toBe(false);
    expect(parsed!.stages[3]!.collapsedByDefault).toBeUndefined();
  });

  it("preserves collapsedByDefault when cloning", () => {
    const source = defaultCategorizations();
    const cloned = cloneCategorizations(source);
    for (const stage of source.stages) {
      const match = cloned.stages.find((s) => s.name === stage.name);
      expect(match).toBeDefined();
      expect(match!.id).not.toBe(stage.id);
      expect(match!.collapsedByDefault).toBe(stage.collapsedByDefault);
    }
  });
});
