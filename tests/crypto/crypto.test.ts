/**
 * P3/P4 crypto tests.
 *
 * Helvety cannot decrypt vault content: this library never sends PRF output,
 * recovery plaintext, or raw user keys to a server. Wrong unwrap material fails.
 * Wrapped blobs and key_check bind AAD `table:recordId:field`.
 */
import { describe, expect, it } from "vitest";
import {
  bytesEqual,
  createKeyCheck,
  decrypt,
  decryptAttachmentBytes,
  decryptAttachmentMeta,
  decryptBinary,
  deriveUnlockKey,
  encodeUtf8,
  encrypt,
  encryptAttachment,
  encryptBinary,
  exportRecoveryKey,
  generatePrfSalt,
  generateRecoveryKey,
  generateUserKeyMaterial,
  importRecoveryKey,
  openSealedKey,
  packBinaryCiphertext,
  sealToPublicKey,
  unpackBinaryCiphertext,
  unwrapKey,
  verifyKeyCheck,
  wrapKey,
} from "@helvety-cloud/crypto";

const TEST_USER_ID = "00000000-0000-4000-8000-0000000000aa";

const wrappedUserKeyAad = {
  table: "user_crypto",
  recordId: TEST_USER_ID,
  field: "wrapped_user_key",
} as const;

const wrappedPrivateKeyAad = {
  table: "user_crypto",
  recordId: TEST_USER_ID,
  field: "wrapped_private_key",
} as const;

const recoveryWrappedAad = {
  table: "user_crypto",
  recordId: TEST_USER_ID,
  field: "recovery_wrapped_user_key",
} as const;

describe("@helvety-cloud/crypto", () => {
  describe("deriveUnlockKey", () => {
    it("is deterministic for the same PRF output and salt", async () => {
      const prf = crypto.getRandomValues(new Uint8Array(32));
      const salt = generatePrfSalt();
      const a = await deriveUnlockKey(prf, salt);
      const b = await deriveUnlockKey(prf, salt);
      expect(bytesEqual(a, b)).toBe(true);
      expect(a.byteLength).toBe(32);
    });

    it("changes when salt changes", async () => {
      const prf = crypto.getRandomValues(new Uint8Array(32));
      const a = await deriveUnlockKey(prf, generatePrfSalt());
      const b = await deriveUnlockKey(prf, generatePrfSalt());
      expect(bytesEqual(a, b)).toBe(false);
    });
  });

  describe("user key hierarchy", () => {
    it("round-trips PRF unlock → user_symmetric_key → X25519 private", async () => {
      const prf = crypto.getRandomValues(new Uint8Array(32));
      const salt = generatePrfSalt();
      const unlockKey = await deriveUnlockKey(prf, salt);
      const material = await generateUserKeyMaterial();

      const wrappedSymmetric = await wrapKey(
        unlockKey,
        material.userSymmetricKey,
        wrappedUserKeyAad,
      );
      const wrappedPrivate = await wrapKey(
        material.userSymmetricKey,
        material.privateKey,
        wrappedPrivateKeyAad,
      );

      const unlockedSymmetric = await unwrapKey(
        unlockKey,
        wrappedSymmetric,
        wrappedUserKeyAad,
      );
      const unlockedPrivate = await unwrapKey(
        unlockedSymmetric,
        wrappedPrivate,
        wrappedPrivateKeyAad,
      );

      expect(bytesEqual(unlockedSymmetric, material.userSymmetricKey)).toBe(
        true,
      );
      expect(bytesEqual(unlockedPrivate, material.privateKey)).toBe(true);
      expect(material.publicKey.byteLength).toBe(32);
    });

    it("rejects wrong unlock key", async () => {
      const unlockKey = await deriveUnlockKey(
        crypto.getRandomValues(new Uint8Array(32)),
        generatePrfSalt(),
      );
      const material = await generateUserKeyMaterial();
      const wrapped = await wrapKey(
        unlockKey,
        material.userSymmetricKey,
        wrappedUserKeyAad,
      );
      const wrongUnlock = await deriveUnlockKey(
        crypto.getRandomValues(new Uint8Array(32)),
        generatePrfSalt(),
      );

      await expect(
        unwrapKey(wrongUnlock, wrapped, wrappedUserKeyAad),
      ).rejects.toThrow();
    });

    it("rejects wrap when AAD binding changes (not column-swappable)", async () => {
      const unlockKey = await deriveUnlockKey(
        crypto.getRandomValues(new Uint8Array(32)),
        generatePrfSalt(),
      );
      const material = await generateUserKeyMaterial();
      const wrapped = await wrapKey(
        unlockKey,
        material.userSymmetricKey,
        wrappedUserKeyAad,
      );

      await expect(
        unwrapKey(unlockKey, wrapped, wrappedPrivateKeyAad),
      ).rejects.toThrow();
      await expect(
        unwrapKey(unlockKey, wrapped, {
          ...wrappedUserKeyAad,
          recordId: "other-user-id",
        }),
      ).rejects.toThrow();
    });
  });

  describe("recovery key", () => {
    it("wraps and unwraps user_symmetric_key", async () => {
      const material = await generateUserKeyMaterial();
      const recovery = generateRecoveryKey();
      const exported = exportRecoveryKey(recovery);
      const imported = importRecoveryKey(exported);

      const wrapped = await wrapKey(
        imported,
        material.userSymmetricKey,
        recoveryWrappedAad,
      );
      const unwrapped = await unwrapKey(imported, wrapped, recoveryWrappedAad);
      expect(bytesEqual(unwrapped, material.userSymmetricKey)).toBe(true);
    });

    it("rejects wrong recovery key", async () => {
      const material = await generateUserKeyMaterial();
      const wrapped = await wrapKey(
        generateRecoveryKey(),
        material.userSymmetricKey,
        recoveryWrappedAad,
      );
      await expect(
        unwrapKey(generateRecoveryKey(), wrapped, recoveryWrappedAad),
      ).rejects.toThrow();
    });
  });

  describe("key_check", () => {
    it("verifies under the correct user_symmetric_key and userId", async () => {
      const material = await generateUserKeyMaterial();
      const check = await createKeyCheck(
        material.userSymmetricKey,
        TEST_USER_ID,
      );
      expect(
        await verifyKeyCheck(material.userSymmetricKey, check, TEST_USER_ID),
      ).toBe(true);
      expect(
        await verifyKeyCheck(generateRecoveryKey(), check, TEST_USER_ID),
      ).toBe(false);
      expect(
        await verifyKeyCheck(
          material.userSymmetricKey,
          check,
          "other-user-id",
        ),
      ).toBe(false);
    });
  });

  describe("content AES-256-GCM + AAD", () => {
    const aad = {
      table: "tasks",
      recordId: "00000000-0000-4000-8000-000000000001",
      field: "encrypted_blob",
    };

    it("round-trips plaintext", async () => {
      const key = crypto.getRandomValues(new Uint8Array(32));
      const plaintext = encodeUtf8('{"title":"hello"}');
      const envelope = await encrypt({ key, plaintext, aad, keyVersion: 1 });
      const decrypted = await decrypt({ key, envelope, aad });
      expect(bytesEqual(decrypted, plaintext)).toBe(true);
      expect(envelope.v).toBe(1);
      expect(envelope.keyVersion).toBe(1);
    });

    it("fails with wrong key", async () => {
      const key = crypto.getRandomValues(new Uint8Array(32));
      const envelope = await encrypt({
        key,
        plaintext: encodeUtf8("secret"),
        aad,
      });
      await expect(
        decrypt({
          key: crypto.getRandomValues(new Uint8Array(32)),
          envelope,
          aad,
        }),
      ).rejects.toThrow();
    });

    it("fails when AAD binding changes (ciphertext not movable)", async () => {
      const key = crypto.getRandomValues(new Uint8Array(32));
      const envelope = await encrypt({
        key,
        plaintext: encodeUtf8("secret"),
        aad,
      });
      await expect(
        decrypt({
          key,
          envelope,
          aad: { ...aad, recordId: "other-id" },
        }),
      ).rejects.toThrow();
    });
  });

  describe("X25519 seal", () => {
    const workspaceId = "00000000-0000-4000-8000-0000000000bb";
    const sealAad = {
      table: "wrapped_keys",
      recordId: workspaceId,
      field: "wrapped_key",
    } as const;

    it("round-trips a workspace-style key", async () => {
      const recipient = await generateUserKeyMaterial();
      const workspaceKey = crypto.getRandomValues(new Uint8Array(32));
      const sealed = await sealToPublicKey(
        recipient.publicKey,
        workspaceKey,
        sealAad,
      );
      const opened = await openSealedKey(recipient.privateKey, sealed, sealAad);
      expect(bytesEqual(opened, workspaceKey)).toBe(true);
    });

    it("fails with wrong private key", async () => {
      const recipient = await generateUserKeyMaterial();
      const other = await generateUserKeyMaterial();
      const sealed = await sealToPublicKey(
        recipient.publicKey,
        crypto.getRandomValues(new Uint8Array(32)),
        sealAad,
      );
      await expect(
        openSealedKey(other.privateKey, sealed, sealAad),
      ).rejects.toThrow();
    });

    it("fails when AAD binding changes (not row-swappable)", async () => {
      const recipient = await generateUserKeyMaterial();
      const workspaceKey = crypto.getRandomValues(new Uint8Array(32));
      const sealed = await sealToPublicKey(
        recipient.publicKey,
        workspaceKey,
        sealAad,
      );
      await expect(
        openSealedKey(recipient.privateKey, sealed, {
          ...sealAad,
          recordId: "other-workspace-id",
        }),
      ).rejects.toThrow();
    });
  });
});

describe("P6b project/task vault content", () => {
  const decoder = new TextDecoder();

  it("encrypts project name with AAD; PUT schema requires encryptedBlob", async () => {
    const { putProjectRequestSchema } = await import(
      "@helvety-cloud/api-contract"
    );
    const workspaceKey = crypto.getRandomValues(new Uint8Array(32));
    const projectId = crypto.randomUUID();
    const aad = {
      table: "projects" as const,
      recordId: projectId,
      field: "encrypted_blob" as const,
    };
    const encryptedBlob = await encrypt({
      key: workspaceKey,
      plaintext: encodeUtf8(JSON.stringify({ name: "Roundtrip Project" })),
      aad,
    });

    expect(putProjectRequestSchema.safeParse({ sortOrder: 0 }).success).toBe(
      false,
    );
    const putBody = putProjectRequestSchema.parse({
      encryptedBlob,
      sortOrder: 0,
    });
    expect(putBody.encryptedBlob).toEqual(encryptedBlob);
    expect(JSON.stringify(putBody)).not.toContain("Roundtrip Project");

    const plain = JSON.parse(
      decoder.decode(
        await decrypt({ key: workspaceKey, envelope: encryptedBlob, aad }),
      ),
    ) as { name: string };
    expect(plain.name).toBe("Roundtrip Project");
  });

  it("encrypts versioned TipTap task body with AAD; PUT schema requires encryptedBlob", async () => {
    const { putTaskRequestSchema } = await import(
      "@helvety-cloud/api-contract"
    );
    const workspaceKey = crypto.getRandomValues(new Uint8Array(32));
    const taskId = crypto.randomUUID();
    const aad = {
      table: "tasks" as const,
      recordId: taskId,
      field: "encrypted_blob" as const,
    };
    const plaintext = {
      version: 1 as const,
      title: "Secret title",
      body: {
        type: "doc" as const,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Secret body" }],
          },
        ],
      },
    };
    const encryptedBlob = await encrypt({
      key: workspaceKey,
      plaintext: encodeUtf8(JSON.stringify(plaintext)),
      aad,
    });

    expect(putTaskRequestSchema.safeParse({ sortOrder: 0 }).success).toBe(
      false,
    );
    const putBody = putTaskRequestSchema.parse({
      encryptedBlob,
      sortOrder: 1,
    });
    expect(JSON.stringify(putBody)).not.toContain("Secret title");
    expect(JSON.stringify(putBody)).not.toContain("Secret body");

    const plain = JSON.parse(
      decoder.decode(
        await decrypt({ key: workspaceKey, envelope: encryptedBlob, aad }),
      ),
    );
    expect(plain).toEqual(plaintext);
  });
});

describe("attachment binary crypto (P11)", () => {
  it("round-trips file bytes + metadata under workspace_key", async () => {
    const workspaceKey = crypto.getRandomValues(new Uint8Array(32));
    const attachmentId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const plaintext = new TextEncoder().encode("hello office doc bytes");
    const payload = await encryptAttachment({
      workspaceKey,
      attachmentId,
      plaintext,
      meta: { filename: "brief.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    });

    expect(payload.byteSize).toBe(payload.packedCiphertext.byteLength);
    expect(JSON.stringify(payload.encryptedMeta)).not.toContain("brief.docx");

    const meta = await decryptAttachmentMeta({
      workspaceKey,
      attachmentId,
      encryptedMeta: payload.encryptedMeta,
    });
    expect(meta.filename).toBe("brief.docx");

    const bytes = await decryptAttachmentBytes({
      workspaceKey,
      attachmentId,
      wrappedDek: payload.wrappedDek,
      packedCiphertext: payload.packedCiphertext,
    });
    expect(new TextDecoder().decode(bytes)).toBe("hello office doc bytes");
  });

  it("fails with the wrong workspace key", async () => {
    const workspaceKey = crypto.getRandomValues(new Uint8Array(32));
    const wrongKey = crypto.getRandomValues(new Uint8Array(32));
    const attachmentId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const payload = await encryptAttachment({
      workspaceKey,
      attachmentId,
      plaintext: new Uint8Array([1, 2, 3, 4]),
      meta: { filename: "a.png", mimeType: "image/png" },
    });

    await expect(
      decryptAttachmentMeta({
        workspaceKey: wrongKey,
        attachmentId,
        encryptedMeta: payload.encryptedMeta,
      }),
    ).rejects.toThrow();

    await expect(
      decryptAttachmentBytes({
        workspaceKey: wrongKey,
        attachmentId,
        wrappedDek: payload.wrappedDek,
        packedCiphertext: payload.packedCiphertext,
      }),
    ).rejects.toThrow();
  });

  it("pack/unpack preserves binary ciphertext", async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const aad = {
      table: "attachments",
      recordId: "id",
      field: "ciphertext",
    } as const;
    const encrypted = await encryptBinary({
      key,
      plaintext: new Uint8Array([9, 8, 7]),
      aad,
    });
    const packed = packBinaryCiphertext(encrypted);
    const unpacked = unpackBinaryCiphertext(packed);
    const plain = await decryptBinary({ key, ciphertext: unpacked, aad });
    expect(Array.from(plain)).toEqual([9, 8, 7]);
  });
});

