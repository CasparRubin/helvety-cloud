import { describe, expect, it } from "vitest";

import {
  parseMilestonePlaintext,
  toMilestonePlaintext,
} from "../../apps/web/lib/vault/milestone-plaintext";
import { EMPTY_TASK_BODY } from "../../apps/web/lib/vault/task-plaintext";

describe("milestone plaintext", () => {
  it("round-trips title, description, and targetDate", () => {
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
    const plain = toMilestonePlaintext("Alpha", doc, "2026-08-01");
    expect(plain).toEqual({
      version: 1,
      title: "Alpha",
      description: doc,
      targetDate: "2026-08-01",
    });
    expect(parseMilestonePlaintext(plain)).toEqual(plain);
  });

  it("defaults missing description and null targetDate", () => {
    const parsed = parseMilestonePlaintext({ title: "Beta" });
    expect(parsed.title).toBe("Beta");
    expect(parsed.description).toEqual(EMPTY_TASK_BODY);
    expect(parsed.targetDate).toBeNull();
  });

  it("rejects invalid targetDate", () => {
    expect(() =>
      parseMilestonePlaintext({ title: "X", targetDate: "08/01/2026" }),
    ).toThrow(/targetDate/);
  });
});
