import { describe, expect, it } from "vitest";

import {
  defaultCategorizations,
  resolveStageColor,
} from "../../apps/web/lib/vault/categorizations";

describe("stage colors", () => {
  it("seeds default stages with EntityColor tokens", () => {
    const cats = defaultCategorizations();
    const byName = Object.fromEntries(
      cats.stages.map((s) => [s.name, s.color]),
    );
    expect(byName.backlog).toBe("slate");
    expect(byName["in progress"]).toBe("amber");
    expect(byName.completed).toBe("green");
    expect(byName.cancelled).toBe("red");
  });

  it("resolveStageColor prefers stored color then name map", () => {
    expect(resolveStageColor({ name: "custom", color: "pink" })).toBe("pink");
    expect(resolveStageColor({ name: "in progress" })).toBe("amber");
    expect(resolveStageColor({ name: "unknown-stage" })).toBeUndefined();
  });
});
