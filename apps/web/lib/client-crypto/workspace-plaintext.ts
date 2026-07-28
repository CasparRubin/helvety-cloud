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

export function parseWorkspacePlaintext(raw: unknown): WorkspacePlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid workspace plaintext");
  }
  const obj = raw as Record<string, unknown>;
  const name = workspaceNameSchema.parse(obj.name);
  const categorizations =
    parseCategorizations(obj.categorizations) ?? defaultCategorizations();
  return { version: 1, name, categorizations };
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
