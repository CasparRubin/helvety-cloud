/**
 * Stripe webhook (P6f). The ONLY place the Supabase service role is used —
 * and only to upsert plaintext billing rows (subscriptions / billing_events).
 * It never reads vault tables and can never decrypt anything (BILLING.md).
 */
import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type SubscriptionRow = {
  workspace_id: string;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
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
  };
}

function workspaceIdFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  return subscription.metadata?.workspace_id ?? null;
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

  // Idempotency: Stripe redelivers events; skip ones we already recorded.
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
          const { error } = await supabase
            .from("subscriptions")
            .upsert(row, { onConflict: "workspace_id" });
          if (error) {
            throw new Error(error.message);
          }
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
          }
          const { error } = await supabase
            .from("subscriptions")
            .upsert(row, { onConflict: "workspace_id" });
          if (error) {
            throw new Error(error.message);
          }
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
          }
        }
        break;
      }
      default:
        // Unhandled event types are recorded below and acknowledged.
        break;
    }
  } catch {
    // Not recorded in billing_events yet, so Stripe retries reprocess fully.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("billing_events").insert({
    stripe_event_id: event.id,
    type: event.type,
    workspace_id: workspaceId,
    payload: JSON.parse(payload),
  });
  // 23505 = duplicate delivery raced us; processing is idempotent upserts.
  if (insertError && insertError.code !== "23505") {
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
