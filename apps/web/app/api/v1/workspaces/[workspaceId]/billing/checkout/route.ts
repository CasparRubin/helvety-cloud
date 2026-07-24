import { billingRedirectResponseSchema } from "@helvety-cloud/api-contract";

import { isWorkspaceOwner } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { resolvePlan } from "@/lib/billing/entitlements";
import {
  getAppUrl,
  getProMonthlyPriceId,
  getStripe,
  isStripeConfigured,
} from "@/lib/stripe";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

/**
 * Owner-only: start a Stripe Checkout session to upgrade this workspace to
 * Pro. Only billing metadata leaves the server — never vault keys or content.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;
  const { workspaceId } = await context.params;

  if (!isStripeConfigured()) {
    return apiError("internal", "Billing is not configured", 500);
  }

  const owner = await isWorkspaceOwner(supabase, workspaceId, user.id);
  if (!owner) {
    return apiError("forbidden", "Only the workspace owner can upgrade", 403);
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("plan, status, stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (subscriptionError) {
    return apiError("internal", subscriptionError.message, 500);
  }
  if (resolvePlan(subscription ?? null) === "pro") {
    return apiError("conflict", "Workspace is already on the Pro plan", 409);
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getProMonthlyPriceId(), quantity: 1 }],
      // Reuse the existing Stripe customer (e.g. lapsed subscription);
      // otherwise Checkout creates one from the billing email.
      ...(subscription?.stripe_customer_id
        ? { customer: subscription.stripe_customer_id }
        : { customer_email: user.email }),
      client_reference_id: workspaceId,
      metadata: { workspace_id: workspaceId },
      subscription_data: { metadata: { workspace_id: workspaceId } },
      success_url: `${appUrl}/app?billing=success`,
      cancel_url: `${appUrl}/app?billing=cancelled`,
    });

    if (!session.url) {
      return apiError("internal", "Stripe returned no checkout URL", 500);
    }
    return jsonOk(billingRedirectResponseSchema.parse({ url: session.url }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe checkout failed";
    return apiError("internal", message, 500);
  }
}
