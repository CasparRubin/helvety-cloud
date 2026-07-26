import { describe, expect, it } from "vitest";

import {
  parseMilestonePlaintext,
  toMilestonePlaintext,
} from "../../apps/web/lib/vault/milestone-plaintext";
import { EMPTY_TASK_BODY } from "../../apps/web/lib/vault/task-plaintext";

describe("milestone plaintext", () => {
  it("round-trips title, description, startDate, and endDate", () => {
    const doc = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Ship", marks: [{ type: "bold" }] },
          ],
        },
      ],
    };
    const plain = toMilestonePlaintext("Alpha", doc, "2026-07-01", "2026-08-01");
    expect(plain).toEqual({
      version: 1,
      title: "Alpha",
      description: doc,
      startDate: "2026-07-01",
      endDate: "2026-08-01",
    });
    expect(parseMilestonePlaintext(plain)).toEqual(plain);
  });

  it("defaults missing description and null dates", () => {
    const parsed = parseMilestonePlaintext({ title: "Beta" });
    expect(parsed.title).toBe("Beta");
    expect(parsed.description).toEqual(EMPTY_TASK_BODY);
    expect(parsed.startDate).toBeNull();
    expect(parsed.endDate).toBeNull();
  });

  it("rejects invalid dates", () => {
    expect(() =>
      parseMilestonePlaintext({ title: "X", startDate: "08/01/2026" }),
    ).toThrow(/startDate/);
    expect(() =>
      parseMilestonePlaintext({ title: "X", endDate: "08/01/2026" }),
    ).toThrow(/endDate/);
  });
});
