/** Workspace plaintext (encrypted under workspace_key). */

import { workspaceNameSchema } from "@helvety-cloud/api-contract";

import {
  defaultCategorizations,
  parseCategorizations,
  type WorkspaceCategorizations,
} from "@/lib/client-crypto/categorizations";

export type WorkspacePlaintext = {
  version: 1;
  name: string;
  categorizations: WorkspaceCategorizations;
};

export type ParsedWorkspacePlaintext = WorkspacePlaintext & {
  /** False when categorizations were missing/invalid and defaults were filled in. */
  hadCategorizations: boolean;
};

export function parseWorkspacePlaintext(raw: unknown): ParsedWorkspacePlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid workspace plaintext");
  }
  const obj = raw as Record<string, unknown>;
  const name = workspaceNameSchema.parse(obj.name);
  const parsed = parseCategorizations(obj.categorizations);
  return {
    version: 1,
    name,
    categorizations: parsed ?? defaultCategorizations(),
    hadCategorizations: parsed !== null,
  };
}

export function toWorkspacePlaintext(
  name: string,
  categorizations: WorkspaceCategorizations = defaultCategorizations(),
): WorkspacePlaintext {
  return {
    version: 1,
    name: workspaceNameSchema.parse(name),
    categorizations,
  };
}
