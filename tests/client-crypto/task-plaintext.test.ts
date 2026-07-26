import { describe, expect, it } from "vitest";

import {
  EMPTY_TASK_BODY,
  parseTaskPlaintext,
  taskBodyPlainText,
  toTaskPlaintext,
} from "../../apps/web/lib/client-crypto/task-plaintext";

describe("task plaintext v1", () => {
  it("parses versioned TipTap body", () => {
    const body = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    };
    expect(
      parseTaskPlaintext({ version: 1, title: "T", body }),
    ).toEqual({ version: 1, title: "T", body, dueDate: null });
  });

  it("round-trips a due date", () => {
    const plaintext = toTaskPlaintext(
      "Due soon",
      EMPTY_TASK_BODY,
      "2026-07-31",
    );
    expect(plaintext.dueDate).toBe("2026-07-31");
    expect(parseTaskPlaintext(plaintext)).toEqual(plaintext);
  });

  it("defaults a missing dueDate to null for existing blobs", () => {
    expect(
      parseTaskPlaintext({ version: 1, title: "T", body: EMPTY_TASK_BODY })
        .dueDate,
    ).toBeNull();
  });

  it("rejects invalid shapes", () => {
    expect(() => parseTaskPlaintext(null)).toThrow("Invalid task plaintext");
    expect(() =>
      parseTaskPlaintext({ version: 1, title: "T", body: "still string" }),
    ).toThrow("Invalid task plaintext");
    expect(() =>
      parseTaskPlaintext({ version: 2, title: "T", body: EMPTY_TASK_BODY }),
    ).toThrow("Invalid task plaintext");
  });

  it("rejects a malformed due date", () => {
    expect(() =>
      parseTaskPlaintext({
        version: 1,
        title: "T",
        body: EMPTY_TASK_BODY,
        dueDate: "2026-13-99",
      }),
    ).toThrow("Invalid task dueDate");
  });

  it("toTaskPlaintext trims title and stamps version 1", () => {
    expect(toTaskPlaintext("  Hi  ", EMPTY_TASK_BODY)).toEqual({
      version: 1,
      title: "Hi",
      body: EMPTY_TASK_BODY,
      dueDate: null,
    });
  });

  it("toTaskPlaintext drops a malformed due date", () => {
    expect(
      toTaskPlaintext("Hi", EMPTY_TASK_BODY, "not-a-date").dueDate,
    ).toBeNull();
  });

  it("taskBodyPlainText flattens TipTap docs", () => {
    expect(taskBodyPlainText(EMPTY_TASK_BODY)).toBe("");
    expect(
      taskBodyPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hello" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "world" }],
          },
        ],
      }),
    ).toBe("Hello world");
  });
});
