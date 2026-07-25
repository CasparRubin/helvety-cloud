import { describe, expect, it } from "vitest";

import {
  EMPTY_TASK_BODY,
  parseTaskPlaintext,
  textToTaskBody,
  toTaskPlaintext,
} from "../../apps/web/lib/vault/task-plaintext";

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
    ).toEqual({ version: 1, title: "T", body });
  });

  it("normalizes legacy P6b string body to TipTap doc", () => {
    expect(
      parseTaskPlaintext({ title: "Legacy", body: "plain text" }),
    ).toEqual({
      version: 1,
      title: "Legacy",
      body: textToTaskBody("plain text"),
    });
  });

  it("normalizes empty legacy body to empty doc", () => {
    expect(parseTaskPlaintext({ title: "Empty", body: "" })).toEqual({
      version: 1,
      title: "Empty",
      body: EMPTY_TASK_BODY,
    });
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

  it("toTaskPlaintext trims title and stamps version 1", () => {
    expect(toTaskPlaintext("  Hi  ", EMPTY_TASK_BODY)).toEqual({
      version: 1,
      title: "Hi",
      body: EMPTY_TASK_BODY,
    });
  });
});
