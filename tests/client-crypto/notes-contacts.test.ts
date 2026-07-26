import { describe, expect, it } from "vitest";
import { decrypt, encrypt, encodeUtf8, randomKeyBytes } from "@helvety-cloud/crypto";

import {
  EMPTY_NOTE_BODY,
  parseNotePlaintext,
  toNotePlaintext,
} from "../../apps/web/lib/client-crypto/note-plaintext";
import {
  parseContactPlaintext,
  toContactPlaintext,
} from "../../apps/web/lib/client-crypto/contact-plaintext";

describe("note plaintext v1", () => {
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
    expect(parseNotePlaintext({ version: 1, title: "T", body })).toEqual({
      version: 1,
      title: "T",
      body,
    });
  });

  it("ignores unknown keys", () => {
    expect(
      parseNotePlaintext({
        version: 1,
        title: "T",
        body: EMPTY_NOTE_BODY,
        extra: true,
      }),
    ).toEqual({
      version: 1,
      title: "T",
      body: EMPTY_NOTE_BODY,
    });
  });

  it("rejects invalid shapes", () => {
    expect(() => parseNotePlaintext(null)).toThrow("Invalid note plaintext");
    expect(() =>
      parseNotePlaintext({
        version: 1,
        title: "T",
        body: "string",
      }),
    ).toThrow("Invalid note plaintext");
  });

  it("toNotePlaintext trims title", () => {
    expect(toNotePlaintext("  Hi  ", EMPTY_NOTE_BODY)).toEqual({
      version: 1,
      title: "Hi",
      body: EMPTY_NOTE_BODY,
    });
  });
});

describe("contact plaintext v1", () => {
  it("parses TipTap notes body", () => {
    expect(
      parseContactPlaintext({
        version: 1,
        displayName: "Ada",
        emails: [],
        phones: [],
        notes: {
          type: "doc",
          content: [{ type: "paragraph" }],
        },
      }).notes,
    ).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("rejects invalid shapes", () => {
    expect(() => parseContactPlaintext(null)).toThrow(
      "Invalid contact plaintext",
    );
    expect(() =>
      parseContactPlaintext({
        version: 1,
        displayName: "Ada",
        emails: "not-array",
        phones: [],
        notes: "",
      }),
    ).toThrow("Invalid contact plaintext");
  });

  it("toContactPlaintext trims fields", () => {
    expect(
      toContactPlaintext({
        displayName: "  Ada  ",
        emails: ["  a@b.c  ", ""],
        phones: [" 1 "],
        notes: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "n" }],
            },
          ],
        },
      }),
    ).toEqual({
      version: 1,
      displayName: "Ada",
      emails: ["a@b.c"],
      phones: ["1"],
      notes: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "n" }],
          },
        ],
      },
    });
  });
});

describe("notes/contacts AAD binding", () => {
  it("round-trips note ciphertext and fails on wrong AAD", async () => {
    const key = randomKeyBytes();
    const noteId = "11111111-1111-4111-8111-111111111111";
    const plaintext = toNotePlaintext("Title", EMPTY_NOTE_BODY);
    const envelope = await encrypt({
      key,
      plaintext: encodeUtf8(JSON.stringify(plaintext)),
      aad: { table: "notes", recordId: noteId, field: "encrypted_blob" },
      keyVersion: 1,
    });
    const bytes = await decrypt({
      key,
      envelope,
      aad: { table: "notes", recordId: noteId, field: "encrypted_blob" },
    });
    expect(parseNotePlaintext(JSON.parse(new TextDecoder().decode(bytes)))).toEqual(
      plaintext,
    );
    await expect(
      decrypt({
        key,
        envelope,
        aad: {
          table: "notes",
          recordId: "22222222-2222-4222-8222-222222222222",
          field: "encrypted_blob",
        },
      }),
    ).rejects.toThrow();
  });

  it("round-trips contact ciphertext and fails on wrong key", async () => {
    const key = randomKeyBytes();
    const wrong = randomKeyBytes();
    const contactId = "33333333-3333-4333-8333-333333333333";
    const plaintext = toContactPlaintext({ displayName: "Ada" });
    const envelope = await encrypt({
      key,
      plaintext: encodeUtf8(JSON.stringify(plaintext)),
      aad: { table: "contacts", recordId: contactId, field: "encrypted_blob" },
      keyVersion: 1,
    });
    await expect(
      decrypt({
        key: wrong,
        envelope,
        aad: {
          table: "contacts",
          recordId: contactId,
          field: "encrypted_blob",
        },
      }),
    ).rejects.toThrow();
  });
});
