import { healthResponseSchema } from "@helvety-cloud/api-contract";

import { jsonOk } from "@/lib/api/errors";

export async function GET() {
  return jsonOk(healthResponseSchema.parse({ ok: true }));
}
