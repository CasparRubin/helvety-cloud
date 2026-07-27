import type { Database } from "@helvety-cloud/db";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { normalizeAddonQuantities } from "@/lib/billing/entitlements";
import { syncWorkspaceFreeOverflowTag } from "@/lib/billing/free-overflow";
import {
  addonQuantitiesFromSubscription,
  getStripe,
  getStripeWebhookSecret,
} from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceApi = SupabaseClient<Database>;

type SubscriptionRow = {
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

function stripeId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
}

function subscriptionRowFromStripe(
  subscription: Stripe.Subscription,
  workspaceId: string,
): SubscriptionRow {
  const item = subscription.items.data[0];
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

function workspaceIdFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  return subscription.metadata?.workspace_id ?? null;
}

async function upsertStripeSubscription(
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

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      getStripeWebhookSecret(),
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: seen, error: seenError } = await supabase
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (seenError) {
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }
  if (seen) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  let workspaceId: string | null = null;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        workspaceId =
          session.metadata?.workspace_id ?? session.client_reference_id;
        const subscriptionId = stripeId(session.subscription);
        if (workspaceId && subscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          const row = subscriptionRowFromStripe(subscription, workspaceId);
          await upsertStripeSubscription(supabase, row);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        workspaceId = workspaceIdFromSubscription(subscription);
        if (workspaceId) {
          const row = subscriptionRowFromStripe(subscription, workspaceId);
          if (event.type === "customer.subscription.deleted") {
            row.plan = "free";
            row.status = "canceled";
            row.addon_quantities = {};
          }
          await upsertStripeSubscription(supabase, row);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = stripeId(invoice.customer);
        if (customerId) {
          const { data: existing, error: lookupError } = await supabase
            .from("subscriptions")
            .select("workspace_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          if (lookupError) {
            throw new Error(lookupError.message);
          }
          if (existing) {
            workspaceId = existing.workspace_id;
            const { error } = await supabase
              .from("subscriptions")
              .update({ status: "past_due" })
              .eq("workspace_id", existing.workspace_id);
            if (error) {
              throw new Error(error.message);
            }
            await syncWorkspaceFreeOverflowTag(supabase, existing.workspace_id);
          }
        }
        break;
      }
      default:
        break;
    }
  } catch {
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("billing_events").insert({
    stripe_event_id: event.id,
    type: event.type,
    workspace_id: workspaceId,
    payload: JSON.parse(payload),
  });
  if (insertError && insertError.code !== "23505") {
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
