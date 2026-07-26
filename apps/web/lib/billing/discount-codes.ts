/**
 * Discount code redeem helpers (P12). Service-role writes only; never vault data.
 * Codes are never logged or returned to the client after redeem.
 */
import type { Database } from "@helvety-cloud/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ensurePercentOffCoupon } from "@/lib/stripe";

type ServiceApi = SupabaseClient<Database>;

export type DiscountCodeRow = {
  id: string;
  code: string;
  percent_off: number;
  active: boolean;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  stripe_coupon_id: string | null;
};

const GENERIC_INVALID = "Invalid or unavailable discount code";
const MAX_ATTEMPTS_PER_HOUR = 10;

export function normalizeDiscountCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function isRedeemable(row: DiscountCodeRow): boolean {
  if (!row.active) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return false;
  }
  if (
    row.max_redemptions != null &&
    row.redemption_count >= row.max_redemptions
  ) {
    return false;
  }
  return true;
}

/** Record an attempt without storing the code (enumeration soft-limit). */
export async function recordDiscountAttempt(
  service: ServiceApi,
  userId: string,
  workspaceId: string,
): Promise<void> {
  await service.from("billing_events").insert({
    stripe_event_id: `discount-attempt:${userId}:${crypto.randomUUID()}`,
    type: "discount.attempt",
    workspace_id: workspaceId,
    payload: { user_id: userId },
  });
}

export async function tooManyRecentDiscountAttempts(
  service: ServiceApi,
  userId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await service
    .from("billing_events")
    .select("payload")
    .eq("type", "discount.attempt")
    .gte("received_at", since)
    .limit(200);
  if (error || !data) {
    return false;
  }
  let count = 0;
  for (const row of data) {
    const payload = row.payload;
    if (
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      payload.user_id === userId
    ) {
      count += 1;
      if (count >= MAX_ATTEMPTS_PER_HOUR) return true;
    }
  }
  return false;
}

export async function lookupDiscountCode(
  service: ServiceApi,
  codeRaw: string,
): Promise<DiscountCodeRow | null> {
  const code = normalizeDiscountCode(codeRaw);
  if (code.length < 8 || code.length > 64) {
    return null;
  }
  const { data, error } = await service
    .from("discount_codes")
    .select(
      "id, code, percent_off, active, max_redemptions, redemption_count, expires_at, stripe_coupon_id",
    )
    .eq("code", code)
    .maybeSingle();
  if (error || !data || !isRedeemable(data)) {
    return null;
  }
  return data;
}

/** Atomically bump redemption_count; returns false if the code is exhausted. */
async function bumpRedemptionCount(
  service: ServiceApi,
  discountId: string,
): Promise<boolean> {
  const { data, error } = await service.rpc("increment_discount_redemption", {
    code_id: discountId,
  });
  if (error) {
    // Fallback if RPC not yet available: non-atomic bump (still better than skip).
    const { data: row } = await service
      .from("discount_codes")
      .select("redemption_count, max_redemptions")
      .eq("id", discountId)
      .maybeSingle();
    if (!row) return false;
    if (
      row.max_redemptions != null &&
      row.redemption_count >= row.max_redemptions
    ) {
      return false;
    }
    const { error: bumpError } = await service
      .from("discount_codes")
      .update({ redemption_count: row.redemption_count + 1 })
      .eq("id", discountId)
      .eq("redemption_count", row.redemption_count);
    return !bumpError;
  }
  return Boolean(data);
}

export async function applyPartialDiscount(args: {
  service: ServiceApi;
  workspaceId: string;
  userId: string;
  discount: DiscountCodeRow;
}): Promise<
  { percentOff: number; stripeCouponId: string } | { error: string }
> {
  const { service, workspaceId, userId, discount } = args;
  if (discount.percent_off >= 100) {
    return { error: GENERIC_INVALID };
  }

  let stripeCouponId: string;
  try {
    stripeCouponId = await ensurePercentOffCoupon(
      discount.percent_off,
      discount.code,
      discount.stripe_coupon_id,
    );
  } catch {
    return { error: "Could not apply discount. Try again later." };
  }

  if (stripeCouponId !== discount.stripe_coupon_id) {
    await service
      .from("discount_codes")
      .update({ stripe_coupon_id: stripeCouponId })
      .eq("id", discount.id);
  }

  const { data: existing } = await service
    .from("subscriptions")
    .select("workspace_id, billing_source, plan, status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existing?.billing_source === "comp" && existing.plan === "pro") {
    return { error: "Workspace already has complimentary Pro access" };
  }

  const bumped = await bumpRedemptionCount(service, discount.id);
  if (!bumped) {
    return { error: GENERIC_INVALID };
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await service.from("subscriptions").upsert(
    {
      workspace_id: workspaceId,
      plan: existing?.plan === "pro" ? "pro" : "free",
      status: existing?.status ?? "active",
      billing_source: "stripe",
      discount_code_id: discount.id,
      discount_percent_off: discount.percent_off,
      stripe_coupon_id: stripeCouponId,
      unmetered: false,
      applied_at: now,
      applied_by_user_id: userId,
    },
    { onConflict: "workspace_id" },
  );
  if (upsertError) {
    return { error: "Could not apply discount. Try again later." };
  }

  return { percentOff: discount.percent_off, stripeCouponId };
}

export async function applyCompGrant(args: {
  service: ServiceApi;
  workspaceId: string;
  userId: string;
  discount: DiscountCodeRow;
}): Promise<{ ok: true } | { error: string }> {
  const { service, workspaceId, userId, discount } = args;
  if (discount.percent_off < 100) {
    return { error: GENERIC_INVALID };
  }

  const bumped = await bumpRedemptionCount(service, discount.id);
  if (!bumped) {
    return { error: GENERIC_INVALID };
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await service.from("subscriptions").upsert(
    {
      workspace_id: workspaceId,
      plan: "pro",
      status: "active",
      billing_source: "comp",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      current_period_end: null,
      cancel_at_period_end: false,
      discount_code_id: discount.id,
      discount_percent_off: 100,
      stripe_coupon_id: null,
      unmetered: true,
      addon_quantities: {},
      applied_at: now,
      applied_by_user_id: userId,
    },
    { onConflict: "workspace_id" },
  );
  if (upsertError) {
    return { error: "Could not apply complimentary access. Try again later." };
  }

  return { ok: true };
}

/**
 * Owner clears an applied discount / complimentary grant from the workspace.
 * Comp → free (unmetered off). Partial → clear discount fields; paid Stripe plan stays.
 * Decrements redemption_count so the catalog code can be reused.
 */
export async function removeWorkspaceDiscount(args: {
  service: ServiceApi;
  workspaceId: string;
}): Promise<{ ok: true } | { error: string; status: 404 | 500 }> {
  const { service, workspaceId } = args;

  const { data: existing, error: readError } = await service
    .from("subscriptions")
    .select("workspace_id, billing_source, discount_code_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (readError) {
    return { error: "Could not remove discount. Try again later.", status: 500 };
  }
  if (!existing?.discount_code_id) {
    return { error: "No discount code is applied to this workspace", status: 404 };
  }

  const discountCodeId = existing.discount_code_id;
  const wasComp = existing.billing_source === "comp";

  const patch = wasComp
    ? {
        plan: "free" as const,
        status: "active" as const,
        billing_source: "stripe" as const,
        unmetered: false,
        discount_code_id: null,
        discount_percent_off: null,
        stripe_coupon_id: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        current_period_end: null,
        cancel_at_period_end: false,
        addon_quantities: {},
        applied_at: null,
        applied_by_user_id: null,
      }
    : {
        discount_code_id: null,
        discount_percent_off: null,
        stripe_coupon_id: null,
      };

  const { error: updateError } = await service
    .from("subscriptions")
    .update(patch)
    .eq("workspace_id", workspaceId);

  if (updateError) {
    return { error: "Could not remove discount. Try again later.", status: 500 };
  }

  const { data: codeRow } = await service
    .from("discount_codes")
    .select("redemption_count")
    .eq("id", discountCodeId)
    .maybeSingle();

  if (codeRow && codeRow.redemption_count > 0) {
    await service
      .from("discount_codes")
      .update({ redemption_count: codeRow.redemption_count - 1 })
      .eq("id", discountCodeId);
  }

  await service.from("billing_events").insert({
    stripe_event_id: `discount-removed:${workspaceId}:${crypto.randomUUID()}`,
    type: "discount.removed",
    workspace_id: workspaceId,
    payload: {
      discount_code_id: discountCodeId,
      was_comp: wasComp,
    },
  });

  return { ok: true };
}

export { GENERIC_INVALID as DISCOUNT_INVALID_MESSAGE };
