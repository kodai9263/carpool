import Stripe from "stripe";
import { PRO_MONTHLY_PRICE_JPY, PRO_YEARLY_PRICE_JPY } from "@/utils/billing";

function unavailable(message: string) {
  return Object.assign(new Error(message), { code: "BILLING_UNAVAILABLE" });
}

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw unavailable("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, { timeout: 5000, maxNetworkRetries: 0 });
  }

  return stripeClient;
}

export function getStripeProPriceId(interval: "month" | "year" = "month") {
  const envName = interval === "year" ? "STRIPE_PRO_YEARLY_PRICE_ID" : "STRIPE_PRO_PRICE_ID";
  const priceId = process.env[envName];
  if (!priceId) {
    throw unavailable(`${envName} is not configured`);
  }

  return priceId;
}

export function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw unavailable("STRIPE_WEBHOOK_SECRET is not configured");
  }

  return webhookSecret;
}

// 表示料金と決済料金の取り違えやWebhook未設定のままの課金を防ぐ。
export async function getValidatedStripeProPriceId(interval: "month" | "year") {
  getStripeWebhookSecret();
  const priceId = getStripeProPriceId(interval);
  const price = await getStripeClient().prices.retrieve(priceId);
  const amount = interval === "year" ? PRO_YEARLY_PRICE_JPY : PRO_MONTHLY_PRICE_JPY;
  if ((process.env.VERCEL_ENV === "production" && !price.livemode) ||
    !price.active || price.currency !== "jpy" || price.unit_amount !== amount ||
    price.type !== "recurring" || price.recurring?.interval !== interval || price.recurring.interval_count !== 1) {
    throw unavailable("Stripe price does not match the advertised plan");
  }
  return price.id;
}
