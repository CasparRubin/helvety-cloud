/** Workspace display name ciphertext (encrypted under workspace_key). */

import { workspaceNameSchema } from "@helvety-cloud/api-contract";

export type WorkspacePlaintext = {
  version: 1;
  name: string;
};

export function parseWorkspacePlaintext(raw: unknown): WorkspacePlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid workspace plaintext");
  }
  const obj = raw as Record<string, unknown>;
  const name = workspaceNameSchema.parse(obj.name);
  return { version: 1, name };
}

export function toWorkspacePlaintext(name: string): WorkspacePlaintext {
  return {
    version: 1,
    name: workspaceNameSchema.parse(name),
  };
}
