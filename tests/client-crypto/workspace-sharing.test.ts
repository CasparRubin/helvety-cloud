/**
 * P6e workspace sharing: seal to invitee public key with wrapped_keys AAD;
 * both members decrypt the same task/note/contact ciphertext.
 */
import { describe, expect, it } from "vitest";
import {
  bytesEqual,
  decrypt,
  generateUserKeyMaterial,
  openSealedKey,
  sealToPublicKey,
  toBase64Url,
} from "@helvety-cloud/crypto";
import {
  createWorkspaceInvitationRequestSchema,
  invitationEmailSchema,
  invitationStatusSchema,
  sealWorkspaceInvitationRequestSchema,
  workspaceInviteRoleSchema,
} from "@helvety-cloud/api-contract";

import {
  decryptContactContent,
  encryptContactContent,
} from "../../apps/web/lib/client-crypto/contacts";
import { toContactPlaintext } from "../../apps/web/lib/client-crypto/contact-plaintext";
import {
  decryptTaskContent,
  encryptTaskContent,
} from "../../apps/web/lib/client-crypto/tasks";
import {
  decryptNoteContent,
  encryptNoteContent,
} from "../../apps/web/lib/client-crypto/notes";
import { sealWorkspaceKeyForInvitee } from "../../apps/web/lib/client-crypto/workspaces";

const workspaceId = "00000000-0000-4000-8000-0000000000e6";

const sealAad = {
  table: "wrapped_keys" as const,
  recordId: workspaceId,
  field: "wrapped_key" as const,
};

describe("P6e invitation contracts", () => {
  it("normalizes invite email and rejects owner role", () => {
    expect(invitationEmailSchema.parse("  Alex@Example.COM ")).toBe(
      "alex@example.com",
    );
    expect(workspaceInviteRoleSchema.safeParse("owner").success).toBe(false);
    expect(workspaceInviteRoleSchema.parse("member")).toBe("member");
    expect(
      createWorkspaceInvitationRequestSchema.parse({
        id: crypto.randomUUID(),
        email: "person@example.com",
      }).role,
    ).toBe("member");
    expect(invitationStatusSchema.parse("waiting_for_owner_seal")).toBe(
      "waiting_for_owner_seal",
    );
  });

  it("requires sealedKey envelope on seal request", () => {
    expect(sealWorkspaceInvitationRequestSchema.safeParse({}).success).toBe(
      false,
    );
  });
});

describe("P6e invitee seal / open", () => {
  it("owner seals workspace key to invitee; invitee opens with final AAD", async () => {
    const owner = await generateUserKeyMaterial();
    const invitee = await generateUserKeyMaterial();
    const workspaceKey = crypto.getRandomValues(new Uint8Array(32));

    const sealed = await sealWorkspaceKeyForInvitee(
      workspaceKey,
      toBase64Url(invitee.publicKey),
      workspaceId,
      1,
    );

    const opened = await openSealedKey(invitee.privateKey, sealed, sealAad);
    expect(bytesEqual(opened, workspaceKey)).toBe(true);

    await expect(
      openSealedKey(owner.privateKey, sealed, sealAad),
    ).rejects.toThrow();
    await expect(
      openSealedKey(invitee.privateKey, sealed, {
        ...sealAad,
        recordId: "other-workspace",
      }),
    ).rejects.toThrow();
  });

  it("both members decrypt the same task, note, and contact ciphertext", async () => {
    const invitee = await generateUserKeyMaterial();
    const workspaceKey = crypto.getRandomValues(new Uint8Array(32));
    const sealed = await sealToPublicKey(
      invitee.publicKey,
      workspaceKey,
      sealAad,
    );
    const inviteeKey = await openSealedKey(
      invitee.privateKey,
      sealed,
      sealAad,
    );

    const taskId = crypto.randomUUID();
    const noteId = crypto.randomUUID();
    const contactId = crypto.randomUUID();

    const taskBlob = await encryptTaskContent(workspaceKey, taskId, {
      version: 1,
      title: "Shared task",
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Secret body" }],
          },
        ],
      },
    });
    const noteBlob = await encryptNoteContent(workspaceKey, noteId, {
      version: 1,
      title: "Shared note",
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Note body" }],
          },
        ],
      },
    });
    const contactBlob = await encryptContactContent(
      workspaceKey,
      contactId,
      toContactPlaintext({
        firstName: "Ada",
        lastName: "Lovelace",
        jobTitle: "Mathematician",
        emails: ["ada@example.com"],
        phones: [],
        notes: { type: "doc", content: [{ type: "paragraph" }] },
      }),
    );

    expect(JSON.stringify(taskBlob)).not.toContain("Shared task");
    expect(JSON.stringify(noteBlob)).not.toContain("Shared note");
    expect(JSON.stringify(contactBlob)).not.toContain("Ada");

    const taskOwner = await decryptTaskContent(
      workspaceKey,
      taskId,
      taskBlob,
    );
    const taskInvitee = await decryptTaskContent(
      inviteeKey,
      taskId,
      taskBlob,
    );
    expect(taskOwner.title).toBe("Shared task");
    expect(taskInvitee.title).toBe(taskOwner.title);

    const noteOwner = await decryptNoteContent(workspaceKey, noteId, noteBlob);
    const noteInvitee = await decryptNoteContent(
      inviteeKey,
      noteId,
      noteBlob,
    );
    expect(noteOwner.title).toBe("Shared note");
    expect(noteInvitee.title).toBe(noteOwner.title);

    const contactOwner = await decryptContactContent(
      workspaceKey,
      contactId,
      contactBlob,
    );
    const contactInvitee = await decryptContactContent(
      inviteeKey,
      contactId,
      contactBlob,
    );
    expect(contactOwner.firstName).toBe("Ada");
    expect(contactOwner.lastName).toBe("Lovelace");
    expect(contactOwner.jobTitle).toBe("Mathematician");
    expect(contactInvitee.firstName).toBe(contactOwner.firstName);

    const stranger = await generateUserKeyMaterial();
    await expect(
      openSealedKey(stranger.privateKey, sealed, sealAad),
    ).rejects.toThrow();

    await expect(
      decrypt({
        key: workspaceKey,
        envelope: taskBlob,
        aad: {
          table: "tasks",
          recordId: "wrong-id",
          field: "encrypted_blob",
        },
      }),
    ).rejects.toThrow();
  });
});
