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
  deriveUnlockKey,
  encodeUtf8,
  encrypt,
  exportRecoveryKey,
  generatePrfSalt,
  generateRecoveryKey,
  generateUserKeyMaterial,
  importRecoveryKey,
  openSealedKey,
  PACKAGE_NAME,
  sealToPublicKey,
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
  it("exports package name", () => {
    expect(PACKAGE_NAME).toBe("@helvety-cloud/crypto");
  });

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
      table: "issues",
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
