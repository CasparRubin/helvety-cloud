import { describe, expect, it } from "vitest";

import {
  defaultCategorizations,
  resolveStageColor,
} from "../../apps/web/lib/client-crypto/categorizations";

describe("stage colors", () => {
  it("seeds default stages with EntityColor tokens", () => {
    const cats = defaultCategorizations();
    const byName = Object.fromEntries(
      cats.stages.map((s) => [s.name, s.color]),
    );
    expect(byName.Backlog).toBe("slate");
    expect(byName["In Progress"]).toBe("amber");
    expect(byName.Completed).toBe("green");
    expect(byName.Cancelled).toBe("red");
  });

  it("resolveStageColor prefers stored color then name map", () => {
    expect(resolveStageColor({ name: "custom", color: "pink" })).toBe("pink");
    expect(resolveStageColor({ name: "In Progress" })).toBe("amber");
    expect(resolveStageColor({ name: "unknown-stage" })).toBeUndefined();
  });
});
