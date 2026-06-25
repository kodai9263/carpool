import { prisma } from "@/lib/prisma";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import { getBillingPlanFromStripeStatus } from "@/utils/billing";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

function getStripeId(value: string | { id?: string } | null | undefined) {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

async function updateAdminFromSubscription(subscription: Stripe.Subscription) {
  const customerId = getStripeId(subscription.customer);
  const adminId = Number(subscription.metadata?.adminId);
  const billingPlan = getBillingPlanFromStripeStatus(subscription.status);
  const data = {
    billingPlan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
  };

  if (Number.isInteger(adminId)) {
    await prisma.admin.update({
      where: { id: adminId },
      data,
    });
    return;
  }

  const where = customerId
    ? { OR: [{ stripeSubscriptionId: subscription.id }, { stripeCustomerId: customerId }] }
    : { stripeSubscriptionId: subscription.id };

  await prisma.admin.updateMany({ where, data });
}

async function markSubscriptionPaymentFailed(subscriptionId?: string) {
  if (!subscriptionId) return;

  await prisma.admin.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      billingPlan: "free",
      stripeSubscriptionStatus: "payment_failed",
    },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId = getStripeId(session.subscription);
  const customerId = getStripeId(session.customer);
  const adminId = Number(session.metadata?.adminId ?? session.client_reference_id);

  if (!subscriptionId) return;

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (Number.isInteger(adminId) && customerId) {
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
        billingPlan: getBillingPlanFromStripeStatus(subscription.status),
      },
    });
    return;
  }

  await updateAdminFromSubscription(subscription);
}

export const POST = async (request: NextRequest) => {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ message: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return NextResponse.json({ message: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await updateAdminFromSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        await markSubscriptionPaymentFailed(getStripeId(invoice.subscription));
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    return NextResponse.json({ message: "Webhook handling failed" }, { status: 500 });
  }
};
