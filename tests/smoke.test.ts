import { describe, expect, it } from "vitest";
import { PACKAGE_NAME as apiContract } from "@helvety-cloud/api-contract";
import { PACKAGE_NAME as crypto } from "@helvety-cloud/crypto";
import { PACKAGE_NAME as db } from "@helvety-cloud/db";

describe("workspace stubs", () => {
  it("resolves package exports", () => {
    expect(crypto).toBe("@helvety-cloud/crypto");
    expect(apiContract).toBe("@helvety-cloud/api-contract");
    expect(db).toBe("@helvety-cloud/db");
  });
});
