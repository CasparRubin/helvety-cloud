import { describe, expect, it } from "vitest";

import { isCategorizationIcon } from "../../apps/web/lib/vault/categorization-icons";
import {
  defaultCategorizations,
  parseCategorizations,
} from "../../apps/web/lib/vault/categorizations";

describe("categorization icons", () => {
  it("seeds default options with icon tokens", () => {
    const cats = defaultCategorizations();
    const labels = Object.fromEntries(cats.labels.map((o) => [o.name, o.icon]));
    const stages = Object.fromEntries(cats.stages.map((o) => [o.name, o.icon]));
    const priorities = Object.fromEntries(
      cats.priorities.map((o) => [o.name, o.icon]),
    );

    expect(labels.bug).toBe("bug");
    expect(labels["new feature"]).toBe("sparkles");
    expect(labels["change request"]).toBe("git-pull-request");

    expect(stages.backlog).toBe("inbox");
    expect(stages["in progress"]).toBe("loader");
    expect(stages.completed).toBe("check-circle");
    expect(stages.cancelled).toBe("x-circle");

    expect(priorities.low).toBe("arrow-down");
    expect(priorities.normal).toBe("minus");
    expect(priorities.high).toBe("arrow-up");
    expect(priorities.urgent).toBe("flame");
  });

  it("isCategorizationIcon rejects unknown tokens", () => {
    expect(isCategorizationIcon("bug")).toBe(true);
    expect(isCategorizationIcon("not-a-real-icon")).toBe(false);
  });

  it("normalizeOption drops unknown icon tokens", () => {
    const parsed = parseCategorizations({
      labels: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "bug",
          sortOrder: 0,
          icon: "not-a-real-icon",
        },
      ],
      stages: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "backlog",
          sortOrder: 0,
          isDefault: true,
          icon: "inbox",
        },
      ],
      priorities: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          name: "normal",
          sortOrder: 0,
          isDefault: true,
          icon: "minus",
        },
      ],
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.labels[0]!.icon).toBeUndefined();
    expect(parsed!.stages[0]!.icon).toBe("inbox");
  });
});
