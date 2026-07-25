import { describe, expect, it } from "vitest";

import {
  cloneCategorizations,
  defaultCategorizations,
  parseCategorizations,
} from "../../apps/web/lib/vault/categorizations";

describe("stage collapsedByDefault", () => {
  it("seeds Backlog and Cancelled collapsed", () => {
    const cats = defaultCategorizations();
    const byName = Object.fromEntries(
      cats.stages.map((s) => [s.name, s.collapsedByDefault === true]),
    );
    expect(byName.Backlog).toBe(true);
    expect(byName.Cancelled).toBe(true);
    expect(byName.Discovery).toBe(false);
    expect(byName.Ready).toBe(false);
    expect(byName["In Progress"]).toBe(false);
    expect(byName.Testing).toBe(false);
    expect(byName.Acceptance).toBe(false);
    expect(byName.Completed).toBe(false);
  });

  it("parses booleans, ignores invalid, and treats missing as unset", () => {
    const parsed = parseCategorizations({
      labels: [],
      stages: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Backlog",
          sortOrder: 0,
          isDefault: true,
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
          collapsedByDefault: false,
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          name: "Cancelled",
          sortOrder: 2,
          collapsedByDefault: "yes",
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
