import {
  updateBillingAddonsRequestSchema,
  updateBillingAddonsResponseSchema,
} from "@helvety-cloud/api-contract";

import { isWorkspaceMember } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import {
  ADDON_PACKS,
  normalizeAddonQuantities,
  resolvePlan,
  type AddonMeter,
  type AddonQuantities,
} from "@/lib/billing/entitlements";
import {
  addonMeterForPriceId,
  getAddonPriceId,
  getStripe,
  isStripeConfigured,
} from "@/lib/stripe";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

/**
 * Any member: set Capacity Increase quantity (0–20) on a paid Pro Workspace
 * subscription.
 */
export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;
  const { workspaceId } = await context.params;

  if (!isStripeConfigured()) {
    return apiError("internal", "Billing is not configured", 500);
  }

  const member = await isWorkspaceMember(supabase, workspaceId, user.id);
  if (!member) {
    return apiError(
      "forbidden",
      "Only workspace members can change addons",
      403,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }
  const parsed = updateBillingAddonsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("plan, status, stripe_subscription_id, addon_quantities")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (subscriptionError) {
    return apiError("internal", subscriptionError.message, 500);
  }

  const subscriptionLike = subscription
    ? {
        plan: subscription.plan,
        status: subscription.status,
        addon_quantities: normalizeAddonQuantities(
          subscription.addon_quantities,
        ),
      }
    : null;

  if (resolvePlan(subscriptionLike) !== "pro") {
    return apiError(
      "forbidden",
      "Capacity Increase requires an active Pro Workspace subscription",
      403,
    );
  }
  if (!subscription?.stripe_subscription_id) {
    return apiError(
      "conflict",
      "No Stripe subscription to attach addons to",
      409,
    );
  }

  const desired: AddonQuantities = {};
  for (const [meter, qty] of Object.entries(parsed.data.quantities)) {
    if (qty > 0) {
      desired[meter as AddonMeter] = qty;
    }
  }

  const stripe = getStripe();
  try {
    const stripeSub = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id,
    );

    const itemsByMeter = new Map<
      AddonMeter,
      { itemId: string; quantity: number }
    >();
    for (const item of stripeSub.items.data) {
      const priceId = item.price?.id;
      if (!priceId) continue;
      const meter = addonMeterForPriceId(priceId);
      if (meter) {
        itemsByMeter.set(meter, {
          itemId: item.id,
          quantity: item.quantity ?? 0,
        });
      }
    }

    const updates: Array<{
      id?: string;
      price?: string;
      quantity?: number;
      deleted?: boolean;
    }> = [];

    for (const pack of ADDON_PACKS) {
      const qty = desired[pack.meter] ?? 0;
      const existing = itemsByMeter.get(pack.meter);
      if (qty <= 0) {
        if (existing) {
          updates.push({ id: existing.itemId, deleted: true });
        }
        continue;
      }
      const priceId = getAddonPriceId(pack.meter);
      if (!priceId) {
        return apiError(
          "internal",
          "Capacity Increase price is not configured",
          500,
        );
      }
      if (existing) {
        if (existing.quantity !== qty) {
          updates.push({ id: existing.itemId, quantity: qty });
        }
      } else {
        updates.push({ price: priceId, quantity: qty });
      }
    }

    if (updates.length > 0) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: updates,
        proration_behavior: "create_prorations",
      });
    }

    const service = createServiceRoleClient();
    const { error: writeError } = await service
      .from("subscriptions")
      .update({ addon_quantities: desired })
      .eq("workspace_id", workspaceId);
    if (writeError) {
      return apiError("internal", writeError.message, 500);
    }

    return jsonOk(
      updateBillingAddonsResponseSchema.parse({
        addons: ADDON_PACKS.map((pack) => ({
          meter: pack.meter,
          quantity: desired[pack.meter] ?? 0,
          packSize: pack.packSize,
          label: pack.label,
        })),
      }),
    );
  } catch {
    return apiError("internal", "Capacity Increase update failed", 500);
  }
}
