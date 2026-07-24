import {
  ciphertextEnvelopeSchema,
  getMeCryptoResponseSchema,
  putMeCryptoRequestSchema,
  putMeCryptoResponseSchema,
  wrappedKeyEnvelopeSchema,
} from "@helvety-cloud/api-contract";

import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("user_crypto")
    .select(
      "user_id, public_key, wrapped_user_key, wrapped_private_key, prf_salt, key_check, key_version",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "User crypto not set up", 404);
  }

  return jsonOk(
    getMeCryptoResponseSchema.parse({
      userId: data.user_id,
      publicKey: data.public_key,
      wrappedUserKey: wrappedKeyEnvelopeSchema.parse(data.wrapped_user_key),
      wrappedPrivateKey: wrappedKeyEnvelopeSchema.parse(
        data.wrapped_private_key,
      ),
      prfSalt: data.prf_salt,
      keyCheck: ciphertextEnvelopeSchema.parse(data.key_check),
      keyVersion: data.key_version,
    }),
  );
}

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
