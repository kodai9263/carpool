import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { getBillingPlanFromStripeStatus } from "@/utils/billing";
import { stripeId } from "@/utils/billingCheckout";
import { trackServerEvent } from "@/utils/serverAnalytics";
import Stripe from "stripe";

// Webhookの到着順ではなくStripeの現在状態を反映する。
export async function syncBillingSubscription(subscriptionId: string, expectedAdminId?: number) {
  const stripe = getStripeClient();
  const initial = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = stripeId(initial.customer);
  const admin = await prisma.admin.findFirst({
    where: { ...(expectedAdminId ? { id: expectedAdminId } : {}), stripeCustomerId: customerId ?? "" },
    select: { id: true },
  });
  if (!admin) return null;
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Admin" WHERE "id" = ${admin.id} FOR UPDATE`;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const current = await tx.admin.findUniqueOrThrow({ where: { id: admin.id } });
    if (current.stripeSubscriptionId && current.stripeSubscriptionId !== subscription.id) {
      const existing = await stripe.subscriptions.retrieve(current.stripeSubscriptionId);
      if (existing.status !== "canceled" && existing.status !== "incomplete_expired") return null;
    }
    await tx.admin.update({
      where: { id: admin.id },
      data: {
        billingPlan: getBillingPlanFromStripeStatus(subscription.status),
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
      },
    });
    return { adminId: admin.id, subscription };
  }, { maxWait: 3000, timeout: 20000 });
}

export async function recordCheckoutConversion(session: Stripe.Checkout.Session, adminId: number, subscription: Stripe.Subscription) {
  if (session.metadata?.conversionVersion !== "1" || session.status !== "complete" || session.mode !== "subscription" ||
    !["paid", "no_payment_required"].includes(session.payment_status) ||
    getBillingPlanFromStripeStatus(subscription.status) !== "pro") return;
  // unique制約でWebhook再送・確認APIの並行実行を永続的に重複除外する。
  const inserted = await prisma.billingConversion.createMany({
    data: [{
      subscriptionId: subscription.id,
      checkoutId: session.id,
      adminId,
      interval: session.metadata?.interval ?? null,
      source: session.metadata?.source ?? "unknown",
      value: session.amount_total ?? 0,
      currency: session.currency ?? "jpy",
    }],
    skipDuplicates: true,
  });
  if (!inserted.count) return;
  // 一次記録はDB。GAはベストエフォートであり、送信失敗を購入失敗にしない。
  await trackServerEvent("purchase", {
    transaction_id: subscription.id,
    value: session.currency === "jpy" ? session.amount_total ?? 0 : (session.amount_total ?? 0) / 100,
    currency: (session.currency ?? "jpy").toUpperCase(),
    source: session.metadata?.source ?? "unknown",
    interval: session.metadata?.interval ?? "unknown",
  }, { adminId });
}
