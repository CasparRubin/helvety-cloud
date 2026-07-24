import { billingRedirectResponseSchema } from "@helvety-cloud/api-contract";

import { isWorkspaceOwner } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { getAppUrl, getStripe } from "@/lib/stripe";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

/**
 * Owner-only: open the Stripe Customer Portal for this workspace's billing
 * (cancel, update payment method, invoices).
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
      "Only the workspace owner can manage billing",
      403,
    );
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (subscriptionError) {
    return apiError("internal", subscriptionError.message, 500);
  }
  if (!subscription?.stripe_customer_id) {
    return apiError(
      "not_found",
      "This workspace has no billing account yet",
      404,
    );
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${getAppUrl()}/app`,
    });
    return jsonOk(billingRedirectResponseSchema.parse({ url: session.url }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe portal failed";
    return apiError("internal", message, 500);
  }
}
