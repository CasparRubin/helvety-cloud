import { describe, expect, it } from "vitest";

import { isCategorizationIcon } from "../../apps/web/lib/client-crypto/categorization-icons";
import {
  defaultCategorizations,
  parseCategorizations,
} from "../../apps/web/lib/client-crypto/categorizations";

describe("categorization icons", () => {
  it("seeds default options with icon tokens", () => {
    const cats = defaultCategorizations();
    const labels = Object.fromEntries(cats.labels.map((o) => [o.name, o.icon]));
    const stages = Object.fromEntries(cats.stages.map((o) => [o.name, o.icon]));
    const priorities = Object.fromEntries(
      cats.priorities.map((o) => [o.name, o.icon]),
    );

    expect(labels.Bug).toBe("bug");
    expect(labels["Change Request"]).toBe("git-pull-request");
    expect(labels["Clean-up"]).toBe("eraser");
    expect(labels.Documentation).toBe("book-open");
    expect(labels.Enhancement).toBe("lightbulb");
    expect(labels.Maintenance).toBe("wrench");
    expect(labels["New Feature"]).toBe("sparkles");

    expect(stages.Backlog).toBe("inbox");
    expect(stages["In Progress"]).toBe("loader");
    expect(stages.Completed).toBe("check-circle");
    expect(stages.Cancelled).toBe("x-circle");

    expect(priorities.Low).toBe("arrow-down");
    expect(priorities.Normal).toBe("minus");
    expect(priorities.High).toBe("arrow-up");
    expect(priorities.Urgent).toBe("flame");
  });

  it("isCategorizationIcon rejects unknown tokens", () => {
    expect(isCategorizationIcon("bug")).toBe(true);
    expect(isCategorizationIcon("eraser")).toBe(true);
    expect(isCategorizationIcon("book-open")).toBe(true);
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
