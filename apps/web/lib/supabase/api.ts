import type { Database } from "@helvety-cloud/db";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { apiError } from "@/lib/api/errors";

export type AuthedApi = {
  supabase: SupabaseClient<Database>;
  user: User;
};

/**
 * User-JWT Supabase client for /api/v1 vault routes.
 * Browser Auth SDK is OK; vault I/O must not use PostgREST from the browser.
 */
export function createClientFromBearer(
  request: Request,
): SupabaseClient<Database> | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY");
  }

  return createClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function requireUser(
  request: Request,
): Promise<AuthedApi | Response> {
  let supabase: SupabaseClient<Database>;
  try {
    const client = createClientFromBearer(request);
    if (!client) {
      return apiError("unauthorized", "Missing Bearer access token", 401);
    }
    supabase = client;
  } catch {
    return apiError("internal", "Server misconfigured", 500);
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return apiError("unauthorized", "Invalid or expired access token", 401);
  }

  return { supabase, user };
}

export function isAuthedApi(
  value: AuthedApi | Response,
): value is AuthedApi {
  return !(value instanceof Response) && "supabase" in value && "user" in value;
}
