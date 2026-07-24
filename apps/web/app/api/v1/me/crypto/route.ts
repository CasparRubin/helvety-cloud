import {
  putMeCryptoRequestSchema,
  putMeCryptoResponseSchema,
} from "@helvety-cloud/api-contract";

import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

export async function PUT(request: Request) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = putMeCryptoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const data = parsed.data;

  const { error: profileError } = await supabase.from("profiles").upsert(
    { id: user.id },
    { onConflict: "id" },
  );
  if (profileError) {
    return apiError("internal", profileError.message, 500);
  }

  const { error: cryptoError } = await supabase.from("user_crypto").upsert(
    {
      user_id: user.id,
      public_key: data.publicKey,
      wrapped_user_key: data.wrappedUserKey,
      wrapped_private_key: data.wrappedPrivateKey,
      prf_salt: data.prfSalt,
      key_check: data.keyCheck,
      key_version: data.keyVersion,
    },
    { onConflict: "user_id" },
  );
  if (cryptoError) {
    return apiError("invalid_ciphertext", cryptoError.message, 400);
  }

  return jsonOk(
    putMeCryptoResponseSchema.parse({
      userId: user.id,
      keyVersion: data.keyVersion,
    }),
  );
}
