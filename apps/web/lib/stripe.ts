/**
 * Stripe server client (P6f / P12). Billing metadata only; encryption keys and
 * content must never be sent to Stripe (BILLING.md).
 */
import Stripe from "stripe";

import {
  ADDON_PACKS,
  type AddonMeter,
  type AddonQuantities,
} from "@/lib/billing/entitlements";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(key);
}

export function getProPriceId(): string {
  const yearly = process.env.STRIPE_PRICE_PRO_WORKSPACE_YEARLY;
  if (yearly) {
    return yearly;
  }
  throw new Error("Missing STRIPE_PRICE_PRO_WORKSPACE_YEARLY");
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }
  return secret;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_PRO_WORKSPACE_YEARLY,
  );
}

export function getAddonPriceId(meter: AddonMeter): string | null {
  const pack = ADDON_PACKS.find((p) => p.meter === meter);
  if (!pack) {
    return null;
  }
  const priceId = process.env[pack.priceEnv];
  return priceId && priceId.length > 0 ? priceId : null;
}

/** Map Stripe Price ID → addon meter (only configured packs). */
export function addonMeterForPriceId(priceId: string): AddonMeter | null {
  for (const pack of ADDON_PACKS) {
    const envId = process.env[pack.priceEnv];
    if (envId && envId === priceId) {
      return pack.meter;
    }
  }
  return null;
}

/**
 * Derive addon pack quantities from a Stripe subscription's line items.
 * Pro base price is ignored; only known addon prices count.
 */
export function addonQuantitiesFromSubscription(
  subscription: Stripe.Subscription,
): AddonQuantities {
  const quantities: AddonQuantities = {};
  for (const item of subscription.items.data) {
    const priceId = item.price?.id;
    if (!priceId) continue;
    const meter = addonMeterForPriceId(priceId);
    if (!meter) continue;
    const qty = item.quantity ?? 0;
    if (qty > 0) {
      quantities[meter] = (quantities[meter] ?? 0) + qty;
    }
  }
  return quantities;
}
