import { describe, expect, it } from "vitest";

import {
  EMPTY_ISSUE_BODY,
  parseIssuePlaintext,
  textToIssueBody,
  toIssuePlaintext,
} from "../../apps/web/lib/vault/issue-plaintext";

describe("issue plaintext v1", () => {
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
      parseIssuePlaintext({ version: 1, title: "T", body }),
    ).toEqual({ version: 1, title: "T", body });
  });

  it("normalizes legacy P6b string body to TipTap doc", () => {
    expect(
      parseIssuePlaintext({ title: "Legacy", body: "plain text" }),
    ).toEqual({
      version: 1,
      title: "Legacy",
      body: textToIssueBody("plain text"),
    });
  });

  it("normalizes empty legacy body to empty doc", () => {
    expect(parseIssuePlaintext({ title: "Empty", body: "" })).toEqual({
      version: 1,
      title: "Empty",
      body: EMPTY_ISSUE_BODY,
    });
  });

  it("rejects invalid shapes", () => {
    expect(() => parseIssuePlaintext(null)).toThrow("Invalid issue plaintext");
    expect(() =>
      parseIssuePlaintext({ version: 1, title: "T", body: "still string" }),
    ).toThrow("Invalid issue plaintext");
    expect(() =>
      parseIssuePlaintext({ version: 2, title: "T", body: EMPTY_ISSUE_BODY }),
    ).toThrow("Invalid issue plaintext");
  });

  it("toIssuePlaintext trims title and stamps version 1", () => {
    expect(toIssuePlaintext("  Hi  ", EMPTY_ISSUE_BODY)).toEqual({
      version: 1,
      title: "Hi",
      body: EMPTY_ISSUE_BODY,
    });
  });
});
