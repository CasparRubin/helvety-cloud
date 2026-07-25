import {
  redeemDiscountRequestSchema,
  redeemDiscountResponseSchema,
} from "@helvety-cloud/api-contract";

import { isWorkspaceOwner } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import {
  DISCOUNT_INVALID_MESSAGE,
  applyCompGrant,
  applyPartialDiscount,
  lookupDiscountCode,
  recordDiscountAttempt,
  tooManyRecentDiscountAttempts,
} from "@/lib/billing/discount-codes";
import { resolvePlan } from "@/lib/billing/entitlements";
import {
  getAppUrl,
  getProPriceId,
  getStripe,
  isStripeConfigured,
} from "@/lib/stripe";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

/**
 * Owner-only: redeem an admin-issued discount code.
 * 100% → complimentary Pro (no card). 1–99% → attach coupon + Checkout.
 * Invalid codes return a generic error (no enumeration). Codes are never logged.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;
  const { workspaceId } = await context.params;

  const owner = await isWorkspaceOwner(supabase, workspaceId, user.id);
  if (!owner) {
    return apiError(
      "forbidden",
      "Only the workspace owner can redeem a discount code",
      403,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }
  const parsed = redeemDiscountRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }

  const service = createServiceRoleClient();

  if (await tooManyRecentDiscountAttempts(service, user.id)) {
    return apiError(
      "rate_limited",
      "Too many discount attempts. Try again later.",
      429,
    );
  }

  await recordDiscountAttempt(service, user.id, workspaceId);

  const discount = await lookupDiscountCode(service, parsed.data.code);
  if (!discount) {
    return apiError("not_found", DISCOUNT_INVALID_MESSAGE, 404);
  }

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("plan, status, billing_source, discount_code_id, stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existing?.discount_code_id) {
    return apiError(
      "conflict",
      "This workspace already has a discount code applied",
      409,
    );
  }

  if (discount.percent_off >= 100) {
    const result = await applyCompGrant({
      service,
      workspaceId,
      userId: user.id,
      discount,
    });
    if ("error" in result) {
      return apiError("invalid_body", result.error, 400);
    }
    return jsonOk(
      redeemDiscountResponseSchema.parse({
        kind: "comp",
        percentOff: 100,
      }),
    );
  }

  if (!isStripeConfigured()) {
    return apiError("internal", "Billing is not configured", 500);
  }

  const partial = await applyPartialDiscount({
    service,
    workspaceId,
    userId: user.id,
    discount,
  });
  if ("error" in partial) {
    return apiError("invalid_body", partial.error, 400);
  }

  if (resolvePlan(existing ?? null) === "pro") {
    return jsonOk(
      redeemDiscountResponseSchema.parse({
        kind: "percent_off",
        percentOff: partial.percentOff,
      }),
    );
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getProPriceId(), quantity: 1 }],
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email }),
      client_reference_id: workspaceId,
      metadata: { workspace_id: workspaceId },
      subscription_data: { metadata: { workspace_id: workspaceId } },
      discounts: [{ coupon: partial.stripeCouponId }],
      success_url: `${appUrl}/app?billing=success`,
      cancel_url: `${appUrl}/app?billing=cancelled`,
    });
    if (!session.url) {
      return apiError("internal", "Stripe returned no checkout URL", 500);
    }
    return jsonOk(
      redeemDiscountResponseSchema.parse({
        kind: "percent_off",
        percentOff: partial.percentOff,
        checkoutUrl: session.url,
      }),
    );
  } catch {
    return apiError("internal", "Stripe checkout failed", 500);
  }
}
