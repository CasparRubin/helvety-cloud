/**
 * API contract abuse brakes: ciphertext size, link/attachment arrays, Capacity qty.
 */
import { describe, expect, it } from "vitest";

import {
  MAX_CAPACITY_ADDON_QUANTITY,
  ciphertextEnvelopeSchema,
  putNoteRequestSchema,
  putTaskRequestSchema,
  updateBillingAddonsRequestSchema,
} from "@helvety-cloud/api-contract";

const tinyEnvelope = {
  v: 1 as const,
  nonce: "YWJj",
  ciphertext: "ZGVm",
  keyVersion: 1,
};

describe("ciphertext envelope size cap", () => {
  it("accepts a small ciphertext payload", () => {
    expect(ciphertextEnvelopeSchema.safeParse(tinyEnvelope).success).toBe(true);
  });

  it("rejects ciphertext past the ~1.5 MiB decoded ceiling", () => {
    const oversized = {
      ...tinyEnvelope,
      // 2_097_153 base64url chars exceeds MAX_CIPHERTEXT_CHARS.
      ciphertext: "a".repeat(2_097_153),
    };
    expect(ciphertextEnvelopeSchema.safeParse(oversized).success).toBe(false);
  });
});

describe("entity link and attachment id caps", () => {
  it("rejects more than 50 links on note PUT", () => {
    const links = Array.from({ length: 51 }, (_, i) => ({
      kind: "task" as const,
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    }));
    expect(
      putNoteRequestSchema.safeParse({
        encryptedBlob: tinyEnvelope,
        links,
      }).success,
    ).toBe(false);
  });

  it("rejects more than 20 attachmentIds on task PUT", () => {
    const attachmentIds = Array.from(
      { length: 21 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    expect(
      putTaskRequestSchema.safeParse({
        encryptedBlob: tinyEnvelope,
        attachmentIds,
      }).success,
    ).toBe(false);
  });
});

describe("Capacity Increase quantity cap", () => {
  it("exports a finite hard ceiling", () => {
    expect(MAX_CAPACITY_ADDON_QUANTITY).toBe(20);
  });

  it("accepts quantity at the ceiling", () => {
    expect(
      updateBillingAddonsRequestSchema.safeParse({
        quantities: { capacity: MAX_CAPACITY_ADDON_QUANTITY },
      }).success,
    ).toBe(true);
  });

  it("rejects quantity above the ceiling", () => {
    expect(
      updateBillingAddonsRequestSchema.safeParse({
        quantities: { capacity: MAX_CAPACITY_ADDON_QUANTITY + 1 },
      }).success,
    ).toBe(false);
  });
});
