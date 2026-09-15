import { prisma } from "@/lib/prisma";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import { stripeId } from "@/utils/billingCheckout";
import { recordCheckoutConversion, syncBillingSubscription } from "@/utils/billingSubscription";
import {
  markSettlementCheckoutReservation,
  recordSettlementCheckoutConversion,
  SETTLEMENT_BILLING_PURPOSE,
  syncSettlementSubscription,
} from "@/utils/settlementBilling";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export const POST = async (request: NextRequest) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ message: "Missing Stripe signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(await request.text(), signature, getStripeWebhookSecret());
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return NextResponse.json({ message: "Invalid webhook signature" }, { status: 400 });
  }
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = await getStripeClient().checkout.sessions.retrieve((event.data.object as Stripe.Checkout.Session).id);
        const subscriptionId = stripeId(session.subscription);
        if (!subscriptionId || session.mode !== "subscription") break;
        if (session.metadata?.billingPurpose === SETTLEMENT_BILLING_PURPOSE) {
          const teamId = Number(session.metadata.settlementTeamId);
          if (!Number.isSafeInteger(teamId) || session.client_reference_id !== String(teamId)) break;
          const synced = await syncSettlementSubscription(subscriptionId, {
            expectedTeamId: teamId,
            checkoutSessionId: session.id,
            event: { id: event.id, type: event.type, created: event.created },
          });
          if (synced) await recordSettlementCheckoutConversion(session, synced);
          break;
        }
        const admin = await prisma.admin.findFirst({ where: { stripeCustomerId: stripeId(session.customer) ?? "" }, select: { id: true } });
        if (!admin || session.client_reference_id !== String(admin.id)) break;
        const synced = await syncBillingSubscription(subscriptionId, admin.id);
        if (synced) await recordCheckoutConversion(session, admin.id, synced.subscription);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscriptionId = (event.data.object as Stripe.Subscription).id;
        const synced = await syncSettlementSubscription(subscriptionId, {
          event: { id: event.id, type: event.type, created: event.created },
        });
        if (!synced) await syncBillingSubscription(subscriptionId);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
        const subscriptionId = stripeId(invoice.parent?.subscription_details?.subscription ?? invoice.subscription);
        if (subscriptionId) {
          const synced = await syncSettlementSubscription(subscriptionId, {
            event: { id: event.id, type: event.type, created: event.created },
          });
          if (!synced) await syncBillingSubscription(subscriptionId);
        }
        break;
      }
      case "checkout.session.expired":
        await markSettlementCheckoutReservation((event.data.object as Stripe.Checkout.Session).id, "expired");
        break;
      case "checkout.session.async_payment_failed":
        await markSettlementCheckoutReservation((event.data.object as Stripe.Checkout.Session).id, "failed");
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    return NextResponse.json({ message: "Webhook handling failed" }, { status: 500 });
  }
};
