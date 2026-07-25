import { describe, expect, it } from "vitest";

import { extractEntityRefsFromDoc } from "../../apps/web/lib/vault/entity-refs";

describe("extractEntityRefsFromDoc", () => {
  it("collects unique entityRef nodes", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "See " },
            {
              type: "entityRef",
              attrs: { kind: "task", id: "11111111-1111-1111-1111-111111111111" },
            },
            { type: "text", text: " and " },
            {
              type: "entityRef",
              attrs: {
                kind: "contact",
                id: "22222222-2222-2222-2222-222222222222",
              },
            },
            {
              type: "entityRef",
              attrs: { kind: "task", id: "11111111-1111-1111-1111-111111111111" },
            },
          ],
        },
      ],
    };
    expect(extractEntityRefsFromDoc(doc)).toEqual([
      { kind: "task", id: "11111111-1111-1111-1111-111111111111" },
      { kind: "contact", id: "22222222-2222-2222-2222-222222222222" },
    ]);
  });

  it("returns empty for docs without refs", () => {
    expect(
      extractEntityRefsFromDoc({
        type: "doc",
        content: [{ type: "paragraph" }],
      }),
    ).toEqual([]);
  });
});
