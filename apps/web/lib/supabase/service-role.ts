/**
 * Service-role Supabase client — justified server jobs only:
 * - Stripe webhook billing rows (subscriptions / billing_events per BILLING.md)
 * - Account deletion (`auth.admin.deleteUser` from DELETE /api/v1/me)
 *
 * Never import this from vault routes and never use it to read or
 * "helpfully" decrypt vault tables.
 */
import type { Database } from "@helvety-cloud/db";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createServiceRoleClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
