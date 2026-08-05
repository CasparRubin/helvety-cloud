import { describe, expect, it } from "vitest";

import { extractEntityRefsFromDoc } from "../../apps/web/lib/client-crypto/entity-refs";

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
    expect(extractEntityRefsFromDoc("note", doc)).toEqual([
      { kind: "task", id: "11111111-1111-1111-1111-111111111111" },
      { kind: "contact", id: "22222222-2222-2222-2222-222222222222" },
    ]);
  });

  it("returns empty for docs without refs", () => {
    expect(
      extractEntityRefsFromDoc("note", {
        type: "doc",
        content: [{ type: "paragraph" }],
      }),
    ).toEqual([]);
  });

  it("ignores project refs from TipTap body (affiliations are not body links)", () => {
    expect(
      extractEntityRefsFromDoc("note", {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "entityRef",
                attrs: {
                  kind: "project",
                  id: "33333333-3333-3333-3333-333333333333",
                },
              },
              {
                type: "entityRef",
                attrs: {
                  kind: "task",
                  id: "11111111-1111-1111-1111-111111111111",
                },
              },
            ],
          },
        ],
      }),
    ).toEqual([
      { kind: "task", id: "11111111-1111-1111-1111-111111111111" },
    ]);
  });

  it("collects database and table refs from notes", () => {
    expect(
      extractEntityRefsFromDoc("note", {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "entityRef",
                attrs: {
                  kind: "database",
                  id: "44444444-4444-4444-4444-444444444444",
                },
              },
              {
                type: "entityRef",
                attrs: {
                  kind: "table",
                  id: "55555555-5555-5555-5555-555555555555",
                },
              },
            ],
          },
        ],
      }),
    ).toEqual([
      { kind: "database", id: "44444444-4444-4444-4444-444444444444" },
      { kind: "table", id: "55555555-5555-5555-5555-555555555555" },
    ]);
  });
});
