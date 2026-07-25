import { describe, expect, it } from "vitest";
import { decrypt, encrypt, encodeUtf8, randomKeyBytes } from "@helvety-cloud/crypto";

import {
  EMPTY_NOTE_BODY,
  parseNotePlaintext,
  toNotePlaintext,
} from "../../apps/web/lib/vault/note-plaintext";
import {
  parseContactPlaintext,
  toContactPlaintext,
} from "../../apps/web/lib/vault/contact-plaintext";

describe("note plaintext v1", () => {
  it("parses versioned TipTap body and tags", () => {
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
      parseNotePlaintext({ version: 1, title: "T", body, tags: ["a", "b"] }),
    ).toEqual({ version: 1, title: "T", body, tags: ["a", "b"] });
  });

  it("defaults missing tags to empty", () => {
    expect(
      parseNotePlaintext({
        version: 1,
        title: "T",
        body: EMPTY_NOTE_BODY,
      }),
    ).toEqual({
      version: 1,
      title: "T",
      body: EMPTY_NOTE_BODY,
      tags: [],
    });
  });

  it("parses optional color palette token", () => {
    expect(
      parseNotePlaintext({
        version: 1,
        title: "T",
        body: EMPTY_NOTE_BODY,
        tags: [],
        color: "violet",
      }),
    ).toEqual({
      version: 1,
      title: "T",
      body: EMPTY_NOTE_BODY,
      tags: [],
      color: "violet",
    });
  });

  it("rejects invalid shapes", () => {
    expect(() => parseNotePlaintext(null)).toThrow("Invalid note plaintext");
    expect(() =>
      parseNotePlaintext({
        version: 1,
        title: "T",
        body: "string",
        tags: [],
      }),
    ).toThrow("Invalid note plaintext");
  });

  it("toNotePlaintext trims title and tags", () => {
    expect(toNotePlaintext("  Hi  ", EMPTY_NOTE_BODY, ["  x  ", ""])).toEqual({
      version: 1,
      title: "Hi",
      body: EMPTY_NOTE_BODY,
      tags: ["x"],
    });
  });
});

describe("contact plaintext v1", () => {
  it("parses identity fields", () => {
    expect(
      parseContactPlaintext({
        version: 1,
        displayName: "Ada",
        emails: ["ada@example.com"],
        phones: ["+1"],
        notes: "friend",
      }),
    ).toEqual({
      version: 1,
      displayName: "Ada",
      emails: ["ada@example.com"],
      phones: ["+1"],
      notes: "friend",
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
        notes: "n",
      }),
    ).toEqual({
      version: 1,
      displayName: "Ada",
      emails: ["a@b.c"],
      phones: ["1"],
      notes: "n",
    });
  });
});

describe("notes/contacts AAD binding", () => {
  it("round-trips note ciphertext and fails on wrong AAD", async () => {
    const key = randomKeyBytes();
    const noteId = "11111111-1111-4111-8111-111111111111";
    const plaintext = toNotePlaintext("Title", EMPTY_NOTE_BODY, ["tag"]);
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
