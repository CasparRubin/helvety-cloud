/**
 * Stripe subscription → `subscriptions` upsert (webhook + Checkout sync).
 */
import type { Database } from "@helvety-cloud/db";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeAddonQuantities } from "@/lib/billing/entitlements";
import { syncWorkspaceFreeOverflowTag } from "@/lib/billing/free-overflow";
import {
  addonQuantitiesFromSubscription,
  getProPriceId,
  getStripe,
} from "@/lib/stripe";

type ServiceApi = SupabaseClient<Database>;

export type SubscriptionRow = {
  workspace_id: string;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  addon_quantities: Record<string, number>;
};

export function stripeId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
}

function primarySubscriptionItem(subscription: Stripe.Subscription) {
  const items = subscription.items.data;
  if (items.length === 0) {
    return null;
  }
  try {
    const proPriceId = getProPriceId();
    const proItem = items.find((item) => item.price?.id === proPriceId);
    if (proItem) {
      return proItem;
    }
  } catch {
    // Pro price env missing: fall back to first item.
  }
  return items[0] ?? null;
}

export function subscriptionRowFromStripe(
  subscription: Stripe.Subscription,
  workspaceId: string,
): SubscriptionRow {
  const item = primarySubscriptionItem(subscription);
  const periodEnd = item?.current_period_end;
  const isEnded =
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired";
  return {
    workspace_id: workspaceId,
    plan: isEnded ? "free" : "pro",
    status: subscription.status,
    stripe_customer_id: stripeId(subscription.customer),
    stripe_subscription_id: subscription.id,
    stripe_price_id: item?.price?.id ?? null,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    addon_quantities: normalizeAddonQuantities(
      addonQuantitiesFromSubscription(subscription),
    ),
  };
}

export function workspaceIdFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  return subscription.metadata?.workspace_id ?? null;
}

export async function upsertStripeSubscription(
  supabase: ServiceApi,
  row: SubscriptionRow,
): Promise<void> {
  const { error } = await supabase.from("subscriptions").upsert(row, {
    onConflict: "workspace_id",
  });
  if (error) {
    throw new Error(error.message);
  }

  await syncWorkspaceFreeOverflowTag(supabase, row.workspace_id);
}

/** Upsert local entitlements from Stripe by subscription id or workspace metadata. */
export async function syncWorkspaceSubscriptionFromStripe(
  supabase: ServiceApi,
  workspaceId: string,
  existingSubscriptionId: string | null,
): Promise<SubscriptionRow | null> {
  const stripe = getStripe();
  let subscription: Stripe.Subscription | null = null;

  if (existingSubscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(
        existingSubscriptionId,
      );
    } catch {
      subscription = null;
    }
  }

  if (!subscription) {
    const found = await stripe.subscriptions.search({
      query: `metadata['workspace_id']:'${workspaceId}'`,
      limit: 1,
    });
    subscription = found.data[0] ?? null;
  }

  if (!subscription) {
    return null;
  }

  const row = subscriptionRowFromStripe(subscription, workspaceId);
  await upsertStripeSubscription(supabase, row);
  return row;
}
