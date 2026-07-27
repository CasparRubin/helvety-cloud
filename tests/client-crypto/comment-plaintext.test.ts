import { describe, expect, it } from "vitest";

import {
  EMPTY_COMMENT_BODY,
  toCommentPlaintext,
  trimTrailingEmptyParagraphs,
} from "../../apps/web/lib/client-crypto/comment-plaintext";

describe("trimTrailingEmptyParagraphs", () => {
  it("keeps a single text paragraph", () => {
    const body = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    };
    expect(trimTrailingEmptyParagraphs(body)).toEqual(body);
  });

  it("drops trailing empty paragraphs", () => {
    const body = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
        { type: "paragraph" },
        { type: "paragraph", content: [] },
      ],
    };
    expect(trimTrailingEmptyParagraphs(body)).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    });
  });

  it("returns empty body when only empty paragraphs remain", () => {
    expect(
      trimTrailingEmptyParagraphs({
        type: "doc",
        content: [{ type: "paragraph" }, { type: "paragraph" }],
      }),
    ).toEqual(EMPTY_COMMENT_BODY);
  });
});

describe("toCommentPlaintext", () => {
  it("trims trailing empties on save", () => {
    const plaintext = toCommentPlaintext({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hi" }],
        },
        { type: "paragraph" },
      ],
    });
    expect(plaintext.body.content).toHaveLength(1);
  });
});
