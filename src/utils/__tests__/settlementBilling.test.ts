/** @jest-environment node */
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import {
  recordSettlementCheckoutConversion,
  syncSettlementSubscription,
  validateSettlementSubscription,
} from "@/utils/settlementBilling";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    team: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    settlementBillingConversion: { createMany: jest.fn() },
  },
}));

jest.mock("@/utils/serverAnalytics", () => ({ trackServerEvent: jest.fn() }));

jest.mock("@/lib/stripe", () => ({
  getStripeClient: jest.fn(),
  getStripeSettlementPriceId: jest.fn(() => "price_settlement"),
}));

const stripe = { subscriptions: { retrieve: jest.fn() } };

function subscription(overrides: Partial<Stripe.Subscription> = {}) {
  return {
    id: "sub_settlement",
    customer: "cus_settlement",
    created: 200,
    status: "active",
    metadata: {
      billingPurpose: "settlement_v1",
      settlementTeamId: "2",
      billingAdminId: "9",
      billingOwnerSupabaseUid: "uid-owner",
      settlementPriceId: "price_settlement",
      settlementProductId: "prod_settlement",
    },
    items: {
      data: [{
        quantity: 1,
        price: {
          id: "price_settlement",
          product: "prod_settlement",
          currency: "jpy",
          unit_amount: 980,
          type: "recurring",
          recurring: { interval: "month", interval_count: 1 },
        },
      }],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function localSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    teamId: 2,
    billingAdminId: 9,
    billingOwnerSupabaseUid: "uid-owner",
    billingOwnerEmail: "owner@example.com",
    stripeCustomerId: "cus_settlement",
    stripeSubscriptionId: "sub_settlement",
    stripeSubscriptionStatus: "active",
    stripePriceId: "price_settlement",
    stripeProductId: "prod_settlement",
    subscriptionStartedAt: new Date(200000),
    lastStripeEventCreatedAt: new Date(100000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function transaction(current = localSubscription()) {
  const tx = {
    $queryRaw: jest.fn(),
    teamSettlementSubscription: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockImplementation(async ({ data }) => ({ ...current, ...data })),
    },
    settlementSubscriptionEvent: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
    },
    settlementCheckoutReservation: { updateMany: jest.fn() },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(tx));
  return tx;
}

beforeEach(() => {
  jest.clearAllMocks();
  (getStripeClient as jest.Mock).mockReturnValue(stripe);
  (prisma.team.findUnique as jest.Mock).mockResolvedValue({
    id: 2,
    adminId: 9,
    admin: { supabaseUid: "uid-owner" },
    settlementSubscription: localSubscription(),
  });
});

test("月980円・対象チーム・担当者が一致する精算契約だけを受け付ける", () => {
  expect(validateSettlementSubscription(subscription())).toEqual({
    teamId: 2,
    billingAdminId: 9,
    billingOwnerSupabaseUid: "uid-owner",
    customerId: "cus_settlement",
    priceId: "price_settlement",
    productId: "prod_settlement",
  });
  expect(validateSettlementSubscription(subscription({ metadata: {} }))).toBeNull();
  expect(() => validateSettlementSubscription(subscription({
    items: { data: [{ quantity: 1, price: { id: "price_other" } }] } as never,
  }))).toThrow("精算契約のStripe情報が一致しません");
});

test("新しいWebhook状態を反映し、イベントと適用結果を記録する", async () => {
  const remote = subscription({ status: "past_due" });
  stripe.subscriptions.retrieve.mockResolvedValue(remote);
  const tx = transaction(localSubscription());

  const result = await syncSettlementSubscription(remote.id, {
    expectedTeamId: 2,
    event: { id: "evt_new", type: "customer.subscription.updated", created: 300 },
  });

  expect(tx.teamSettlementSubscription.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ stripeSubscriptionStatus: "past_due" }),
  }));
  expect(tx.settlementSubscriptionEvent.update).toHaveBeenCalledWith({
    where: { stripeEventId: "evt_new" },
    data: { applied: true },
  });
  expect(result).toMatchObject({ active: false, applied: true, canManageBilling: true });
});

test("古いWebhookが後から届いても現在状態を巻き戻さない", async () => {
  stripe.subscriptions.retrieve.mockResolvedValue(subscription({ status: "active" }));
  const tx = transaction(localSubscription({
    stripeSubscriptionStatus: "past_due",
    lastStripeEventCreatedAt: new Date(400000),
  }));

  const result = await syncSettlementSubscription("sub_settlement", {
    event: { id: "evt_old", type: "customer.subscription.updated", created: 300 },
  });

  expect(tx.settlementSubscriptionEvent.createMany).toHaveBeenCalled();
  expect(tx.teamSettlementSubscription.update).not.toHaveBeenCalled();
  expect(result).toMatchObject({ active: false, applied: false });
});

test("同じWebhookの再送を重複適用しない", async () => {
  stripe.subscriptions.retrieve.mockResolvedValue(subscription());
  const tx = transaction(localSubscription());
  tx.settlementSubscriptionEvent.createMany.mockResolvedValue({ count: 0 });

  const result = await syncSettlementSubscription("sub_settlement", {
    event: { id: "evt_duplicate", type: "customer.subscription.updated", created: 300 },
  });

  expect(tx.teamSettlementSubscription.update).not.toHaveBeenCalled();
  expect(result).toMatchObject({ applied: false });
});

test("再契約後に旧契約のイベントが届いても新契約を維持する", async () => {
  stripe.subscriptions.retrieve.mockResolvedValue(subscription({
    id: "sub_old",
    created: 100,
    status: "canceled",
  }));
  const current = localSubscription({
    stripeSubscriptionId: "sub_new",
    stripeSubscriptionStatus: "active",
    subscriptionStartedAt: new Date(500000),
  });
  (prisma.team.findUnique as jest.Mock).mockResolvedValue({
    id: 2,
    adminId: 9,
    admin: { supabaseUid: "uid-owner" },
    settlementSubscription: current,
  });
  const tx = transaction(current);

  const result = await syncSettlementSubscription("sub_old", {
    event: { id: "evt_old_cancel", type: "customer.subscription.deleted", created: 600 },
  });

  expect(tx.teamSettlementSubscription.update).not.toHaveBeenCalled();
  expect(result).toMatchObject({ active: true, applied: false });
});

test("終了済み契約の後は新しい再契約を反映する", async () => {
  stripe.subscriptions.retrieve.mockResolvedValue(subscription({ id: "sub_new", created: 500 }));
  const current = localSubscription({
    stripeSubscriptionId: "sub_old",
    stripeSubscriptionStatus: "canceled",
    subscriptionStartedAt: new Date(100000),
  });
  (prisma.team.findUnique as jest.Mock).mockResolvedValue({
    id: 2,
    adminId: 9,
    admin: { supabaseUid: "uid-owner" },
    settlementSubscription: current,
  });
  const tx = transaction(current);

  const result = await syncSettlementSubscription("sub_new", {
    event: { id: "evt_reactivate", type: "customer.subscription.created", created: 500 },
  });

  expect(tx.teamSettlementSubscription.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ stripeSubscriptionId: "sub_new", stripeSubscriptionStatus: "active" }),
  }));
  expect(result).toMatchObject({ active: true, applied: true });
});

test("成立済みCheckoutを重複計上せずチーム別に記録する", async () => {
  (prisma.settlementBillingConversion.createMany as jest.Mock)
    .mockResolvedValueOnce({ count: 1 })
    .mockResolvedValueOnce({ count: 0 });
  const checkout = {
    id: "cs_paid",
    status: "complete",
    mode: "subscription",
    payment_status: "paid",
    amount_total: 980,
    currency: "jpy",
    metadata: {
      billingPurpose: "settlement_v1",
      settlementTeamId: "2",
      billingAdminId: "9",
    },
  } as unknown as Stripe.Checkout.Session;
  const synced = { teamId: 2, active: true, subscription: subscription() };

  await recordSettlementCheckoutConversion(checkout, synced);
  await recordSettlementCheckoutConversion(checkout, synced);

  expect(prisma.settlementBillingConversion.createMany).toHaveBeenCalledWith({
    data: [{
      checkoutId: "cs_paid",
      stripeSubscriptionId: "sub_settlement",
      teamId: 2,
      billingAdminId: 9,
      value: 980,
      currency: "jpy",
    }],
    skipDuplicates: true,
  });
});
