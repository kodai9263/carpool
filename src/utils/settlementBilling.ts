import type { SettlementCheckoutReservation, TeamSettlementSubscription } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient, getStripeSettlementPriceId } from "@/lib/stripe";
import { stripeId } from "@/utils/billingCheckout";
import { isSettlementSubscriptionActive, SETTLEMENT_MONTHLY_PRICE_JPY } from "@/utils/settlementAccess";
import { trackServerEvent } from "@/utils/serverAnalytics";

export const SETTLEMENT_BILLING_PURPOSE = "settlement_v1";
export const SETTLEMENT_TERMINAL_STATUSES = ["canceled", "incomplete_expired"] as const;

export function isSettlementSubscriptionTerminal(status?: string | null) {
  return SETTLEMENT_TERMINAL_STATUSES.includes(status as (typeof SETTLEMENT_TERMINAL_STATUSES)[number]);
}

export class SettlementBillingError extends Error {
  constructor(
    readonly code:
      | "SETTLEMENT_BILLING_INVALID"
      | "SETTLEMENT_BILLING_OWNER_CHANGED"
      | "SETTLEMENT_BILLING_TRANSFER_PENDING",
    message: string,
  ) {
    super(message);
    this.name = "SettlementBillingError";
  }
}

type ValidatedSubscription = {
  teamId: number;
  billingAdminId: number;
  billingOwnerSupabaseUid: string;
  customerId: string;
  priceId: string;
  productId: string;
};

function positiveInteger(value: string | undefined) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function validateSettlementSubscription(subscription: Stripe.Subscription): ValidatedSubscription | null {
  if (subscription.metadata.billingPurpose !== SETTLEMENT_BILLING_PURPOSE) return null;
  const teamId = positiveInteger(subscription.metadata.settlementTeamId);
  const billingAdminId = positiveInteger(subscription.metadata.billingAdminId);
  const billingOwnerSupabaseUid = subscription.metadata.billingOwnerSupabaseUid;
  const customerId = stripeId(subscription.customer);
  const expectedPriceId = getStripeSettlementPriceId();
  const item = subscription.items.data[0];
  const productId = item ? stripeId(item.price.product) : undefined;
  if (
    !teamId ||
    !billingAdminId ||
    !billingOwnerSupabaseUid ||
    !customerId ||
    subscription.items.data.length !== 1 ||
    !item ||
    item.quantity !== 1 ||
    item.price.id !== expectedPriceId ||
    item.price.currency !== "jpy" ||
    item.price.unit_amount !== SETTLEMENT_MONTHLY_PRICE_JPY ||
    item.price.type !== "recurring" ||
    item.price.recurring?.interval !== "month" ||
    item.price.recurring.interval_count !== 1 ||
    !productId ||
    subscription.metadata.settlementPriceId !== expectedPriceId ||
    subscription.metadata.settlementProductId !== productId
  ) {
    throw new SettlementBillingError("SETTLEMENT_BILLING_INVALID", "精算契約のStripe情報が一致しません");
  }
  return { teamId, billingAdminId, billingOwnerSupabaseUid, customerId, priceId: expectedPriceId, productId };
}

type StripeEventContext = {
  id: string;
  type: string;
  created: number;
};

export async function syncSettlementSubscription(
  subscriptionId: string,
  options: {
    expectedTeamId?: number;
    event?: StripeEventContext;
    checkoutSessionId?: string;
  } = {},
) {
  // Stripe通信を先に完了させ、DB行ロック中は外部通信を行わない。
  const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
  const validated = validateSettlementSubscription(subscription);
  if (!validated) return null;
  if (options.expectedTeamId && validated.teamId !== options.expectedTeamId) {
    throw new SettlementBillingError("SETTLEMENT_BILLING_INVALID", "精算契約のチームが一致しません");
  }
  const team = await prisma.team.findUnique({
    where: { id: validated.teamId },
    select: {
      id: true,
      adminId: true,
      admin: { select: { supabaseUid: true } },
      settlementSubscription: true,
    },
  });
  const local = team?.settlementSubscription;
  if (
    !team ||
    !local ||
    local.billingAdminId !== validated.billingAdminId ||
    local.billingOwnerSupabaseUid !== validated.billingOwnerSupabaseUid ||
    (local.stripeCustomerId && local.stripeCustomerId !== validated.customerId)
  ) {
    throw new SettlementBillingError("SETTLEMENT_BILLING_INVALID", "精算契約の保存情報が一致しません");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "TeamSettlementSubscription" WHERE "teamId" = ${validated.teamId} FOR UPDATE`;
    const current = await tx.teamSettlementSubscription.findUniqueOrThrow({ where: { teamId: validated.teamId } });
    const eventCreatedAt = options.event ? new Date(options.event.created * 1000) : null;
    let eventInserted = true;
    if (options.event) {
      const inserted = await tx.settlementSubscriptionEvent.createMany({
        data: [{
          stripeEventId: options.event.id,
          eventType: options.event.type,
          eventCreatedAt: eventCreatedAt!,
          teamId: validated.teamId,
          billingAdminId: validated.billingAdminId,
          billingOwnerSupabaseUid: validated.billingOwnerSupabaseUid,
          stripeSubscriptionId: subscription.id,
          stripeStatus: subscription.status,
          stripePriceId: validated.priceId,
          stripeProductId: validated.productId,
          applied: false,
        }],
        skipDuplicates: true,
      });
      eventInserted = inserted.count === 1;
    }

    const startedAt = new Date(subscription.created * 1000);
    const currentIsNewer = Boolean(
      current.stripeSubscriptionId &&
      current.stripeSubscriptionId !== subscription.id &&
      current.subscriptionStartedAt &&
      current.subscriptionStartedAt.getTime() > startedAt.getTime(),
    );
    const currentDifferentAndOngoing = Boolean(
      current.stripeSubscriptionId &&
      current.stripeSubscriptionId !== subscription.id &&
      !isSettlementSubscriptionTerminal(current.stripeSubscriptionStatus),
    );
    const staleEvent = Boolean(
      eventCreatedAt &&
      current.stripeSubscriptionId === subscription.id &&
      current.lastStripeEventCreatedAt &&
      current.lastStripeEventCreatedAt.getTime() > eventCreatedAt.getTime(),
    );
    const shouldApply = eventInserted && !currentIsNewer && !currentDifferentAndOngoing && !staleEvent;

    let updated: TeamSettlementSubscription = current;
    if (shouldApply) {
      updated = await tx.teamSettlementSubscription.update({
        where: { id: current.id },
        data: {
          stripeCustomerId: validated.customerId,
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: subscription.status,
          stripePriceId: validated.priceId,
          stripeProductId: validated.productId,
          subscriptionStartedAt: startedAt,
          ...(eventCreatedAt ? { lastStripeEventCreatedAt: eventCreatedAt } : {}),
        },
      });
      if (options.event) {
        await tx.settlementSubscriptionEvent.update({
          where: { stripeEventId: options.event.id },
          data: { applied: true },
        });
      }
    }
    if (options.checkoutSessionId && isSettlementSubscriptionActive(updated.stripeSubscriptionStatus)) {
      await tx.settlementCheckoutReservation.updateMany({
        where: { teamId: validated.teamId, stripeCheckoutSessionId: options.checkoutSessionId },
        data: { status: "complete", activeKey: null },
      });
    }
    return {
      teamId: validated.teamId,
      subscription,
      active: isSettlementSubscriptionActive(updated.stripeSubscriptionStatus),
      applied: shouldApply,
      canManageBilling: team.admin.supabaseUid === updated.billingOwnerSupabaseUid,
    };
  }, { maxWait: 3000, timeout: 10000 });
}

export async function markSettlementCheckoutReservation(
  sessionId: string,
  status: Extract<SettlementCheckoutReservation["status"], string>,
) {
  await prisma.settlementCheckoutReservation.updateMany({
    where: { stripeCheckoutSessionId: sessionId },
    data: {
      status,
      ...(status === "open" || status === "creating" ? {} : { activeKey: null }),
    },
  });
}

export async function recordSettlementCheckoutConversion(
  session: Stripe.Checkout.Session,
  synced: { teamId: number; active: boolean; subscription: Stripe.Subscription },
) {
  if (
    !synced.active ||
    session.status !== "complete" ||
    session.mode !== "subscription" ||
    !["paid", "no_payment_required"].includes(session.payment_status) ||
    session.metadata?.billingPurpose !== SETTLEMENT_BILLING_PURPOSE ||
    session.metadata?.settlementTeamId !== String(synced.teamId)
  ) return;
  const billingAdminId = positiveInteger(session.metadata.billingAdminId);
  if (!billingAdminId) return;
  const inserted = await prisma.settlementBillingConversion.createMany({
    data: [{
      checkoutId: session.id,
      stripeSubscriptionId: synced.subscription.id,
      teamId: synced.teamId,
      billingAdminId,
      value: session.amount_total ?? 0,
      currency: session.currency ?? "jpy",
    }],
    skipDuplicates: true,
  });
  if (!inserted.count) return;
  await trackServerEvent("purchase", {
    transaction_id: synced.subscription.id,
    value: session.currency === "jpy"
      ? session.amount_total ?? 0
      : (session.amount_total ?? 0) / 100,
    currency: (session.currency ?? "jpy").toUpperCase(),
    plan: "settlement_team_monthly",
    team_id: synced.teamId,
  }, { adminId: billingAdminId });
}
