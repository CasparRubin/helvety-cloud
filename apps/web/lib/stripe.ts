/**
 * Stripe server client (P6f). Billing metadata only — vault keys and vault
 * content must never be sent to Stripe (BILLING.md).
 */
import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(key);
}

export function getProMonthlyPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!priceId) {
    throw new Error("Missing STRIPE_PRICE_PRO_MONTHLY");
  }
  return priceId;
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
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO_MONTHLY,
  );
}
