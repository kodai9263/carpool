/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { recordSettlementCheckoutConversion, syncSettlementSubscription } from "@/utils/settlementBilling";

jest.mock("@/utils/withAuth", () => ({
  withAuthTeam: jest.fn(async (
    _request: NextRequest,
    handler: (context: { adminId: number; teamId: number }) => Promise<Response>,
  ) => handler({ adminId: 9, teamId: 2 })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    team: { findFirst: jest.fn() },
    teamSettlementSubscription: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    settlementCheckoutReservation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/stripe", () => ({
  getStripeClient: jest.fn(),
  getValidatedStripeSettlementPrice: jest.fn().mockResolvedValue({
    priceId: "price_settlement",
    productId: "prod_settlement",
  }),
}));

jest.mock("@/utils/settlementBilling", () => ({
  ...jest.requireActual("@/utils/settlementBilling"),
  syncSettlementSubscription: jest.fn(),
  recordSettlementCheckoutConversion: jest.fn(),
}));

const stripe = {
  customers: { retrieve: jest.fn(), create: jest.fn() },
  subscriptions: { list: jest.fn() },
  checkout: { sessions: { retrieve: jest.fn(), create: jest.fn(), expire: jest.fn() } },
  billingPortal: { sessions: { create: jest.fn() } },
};

const team = {
  id: 2,
  adminId: 9,
  admin: {
    email: "owner@example.com",
    supabaseUid: "uid-owner",
    pendingTransferNewEmail: null,
    pendingTransferNewSupabaseUid: null,
  },
};

const subscription = {
  id: 1,
  teamId: 2,
  billingAdminId: 9,
  billingOwnerSupabaseUid: "uid-owner",
  billingOwnerEmail: "owner@example.com",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripeSubscriptionStatus: null,
  stripePriceId: null,
  stripeProductId: null,
  subscriptionStartedAt: null,
  lastStripeEventCreatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const reservation = {
  id: 11,
  operationKey: "operation-1",
  activeKey: "settlement-team:2",
  teamId: 2,
  billingAdminId: 9,
  billingOwnerSupabaseUid: "uid-owner",
  returnPath: "/admin/teams/2/settlements",
  stripeCheckoutSessionId: null,
  status: "creating",
  expiresAt: new Date(Date.now() + 60000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function request(body: Record<string, unknown> = {}) {
  return new NextRequest("https://app.example/api/admin/teams/2/settlement-billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (getStripeClient as jest.Mock).mockReturnValue(stripe);
  (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(prisma));
  (prisma.team.findFirst as jest.Mock).mockResolvedValue(team);
  (prisma.teamSettlementSubscription.findUniqueOrThrow as jest.Mock).mockResolvedValue(subscription);
  (prisma.teamSettlementSubscription.update as jest.Mock).mockImplementation(async ({ data }) => ({
    ...subscription,
    ...data,
  }));
  (prisma.settlementCheckoutReservation.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.settlementCheckoutReservation.create as jest.Mock).mockResolvedValue(reservation);
  (prisma.settlementCheckoutReservation.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  stripe.customers.create.mockResolvedValue({ id: "cus_settlement" });
  stripe.subscriptions.list.mockResolvedValue({ data: [], has_more: false });
  stripe.checkout.sessions.create.mockResolvedValue({
    id: "cs_settlement",
    url: "https://checkout.stripe.com/test",
    expires_at: Math.floor(Date.now() / 1000) + 86400,
  });
  stripe.billingPortal.sessions.create.mockResolvedValue({ url: "https://billing.stripe.com/test" });
});

test("既存Proとは別のチーム専用顧客と月980円Checkoutを作る", async () => {
  const response = await POST(request(), { params: { teamId: "2" } });
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toMatchObject({ destination: "checkout", url: "https://checkout.stripe.com/test" });
  expect(stripe.customers.create).toHaveBeenCalledWith(expect.objectContaining({
    email: "owner@example.com",
    metadata: expect.objectContaining({
      billingPurpose: "settlement_v1",
      settlementTeamId: "2",
      billingOwnerSupabaseUid: "uid-owner",
    }),
  }), expect.objectContaining({ idempotencyKey: "settlement-customer-operation-1" }));
  expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
    customer: "cus_settlement",
    line_items: [{ price: "price_settlement", quantity: 1 }],
    client_reference_id: "2",
    metadata: expect.objectContaining({ settlementProductId: "prod_settlement" }),
    success_url: expect.stringContaining("settlement_session_id={CHECKOUT_SESSION_ID}"),
  }), { idempotencyKey: "settlement-checkout-operation-1" });
});

test("担当者引継ぎ中は顧客もCheckoutも作らない", async () => {
  (prisma.team.findFirst as jest.Mock).mockResolvedValue({
    ...team,
    admin: { ...team.admin, pendingTransferNewEmail: "next@example.com" },
  });

  const response = await POST(request(), { params: { teamId: "2" } });

  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ code: "SETTLEMENT_BILLING_TRANSFER_PENDING" });
  expect(stripe.customers.create).not.toHaveBeenCalled();
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
});

test("解約後に担当者が変わった場合は旧Checkout予約を失効して新規申込できる", async () => {
  const oldOwnerSubscription = {
    ...subscription,
    billingOwnerSupabaseUid: "uid-old-owner",
    stripeCustomerId: "cus_old_owner",
    stripeSubscriptionId: "sub_canceled",
    stripeSubscriptionStatus: "canceled",
  };
  (prisma.teamSettlementSubscription.findUniqueOrThrow as jest.Mock)
    .mockResolvedValueOnce(oldOwnerSubscription)
    .mockResolvedValueOnce(subscription);

  const response = await POST(request(), { params: { teamId: "2" } });

  expect(response.status).toBe(200);
  expect(prisma.settlementCheckoutReservation.updateMany).toHaveBeenCalledWith({
    where: { teamId: 2, activeKey: "settlement-team:2" },
    data: { status: "failed", activeKey: null },
  });
  expect(prisma.teamSettlementSubscription.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      billingOwnerSupabaseUid: "uid-owner",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    }),
  }));
  expect(stripe.checkout.sessions.create).toHaveBeenCalled();
});

test("二重クリックは保存済みの同じCheckoutを再利用する", async () => {
  const ownedSubscription = { ...subscription, stripeCustomerId: "cus_settlement" };
  const existingReservation = { ...reservation, stripeCheckoutSessionId: "cs_open", status: "open" };
  (prisma.teamSettlementSubscription.findUniqueOrThrow as jest.Mock).mockResolvedValue(ownedSubscription);
  (prisma.settlementCheckoutReservation.findUnique as jest.Mock).mockResolvedValue(existingReservation);
  stripe.customers.retrieve.mockResolvedValue({
    id: "cus_settlement",
    deleted: false,
    metadata: {
      billingPurpose: "settlement_v1",
      settlementTeamId: "2",
      billingOwnerSupabaseUid: "uid-owner",
    },
  });
  stripe.checkout.sessions.retrieve.mockResolvedValue({
    id: "cs_open",
    status: "open",
    url: "https://checkout.stripe.com/reused",
    customer: "cus_settlement",
    metadata: {
      billingPurpose: "settlement_v1",
      settlementTeamId: "2",
      billingOwnerSupabaseUid: "uid-owner",
    },
  });

  const response = await POST(request(), { params: { teamId: "2" } });

  expect(await response.json()).toMatchObject({ url: "https://checkout.stripe.com/reused" });
  expect(stripe.customers.create).not.toHaveBeenCalled();
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
});

test("Stripe側で期限切れのCheckoutは予約を交換して新しく作る", async () => {
  const ownedSubscription = { ...subscription, stripeCustomerId: "cus_settlement" };
  const expiredReservation = { ...reservation, stripeCheckoutSessionId: "cs_expired", status: "open" };
  const newReservation = { ...reservation, id: 12, operationKey: "operation-2", stripeCheckoutSessionId: null };
  (prisma.teamSettlementSubscription.findUniqueOrThrow as jest.Mock).mockResolvedValue(ownedSubscription);
  (prisma.settlementCheckoutReservation.findUnique as jest.Mock).mockResolvedValue(expiredReservation);
  (prisma.settlementCheckoutReservation.create as jest.Mock).mockResolvedValueOnce(newReservation);
  stripe.customers.retrieve.mockResolvedValue({
    id: "cus_settlement",
    deleted: false,
    metadata: {
      billingPurpose: "settlement_v1",
      settlementTeamId: "2",
      billingOwnerSupabaseUid: "uid-owner",
    },
  });
  stripe.checkout.sessions.retrieve.mockResolvedValue({
    id: "cs_expired",
    status: "expired",
    customer: "cus_settlement",
    metadata: {
      billingPurpose: "settlement_v1",
      settlementTeamId: "2",
      billingOwnerSupabaseUid: "uid-owner",
    },
  });

  const response = await POST(request(), { params: { teamId: "2" } });

  expect(response.status).toBe(200);
  expect(prisma.settlementCheckoutReservation.update).toHaveBeenCalledWith({
    where: { id: 11 },
    data: { status: "expired", activeKey: null },
  });
  expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
    expect.any(Object),
    { idempotencyKey: "settlement-checkout-operation-2" },
  );
});

test("契約が存在する場合は重複申込せず支払い管理へ送る", async () => {
  const ownedSubscription = { ...subscription, stripeCustomerId: "cus_settlement" };
  (prisma.teamSettlementSubscription.findUniqueOrThrow as jest.Mock).mockResolvedValue(ownedSubscription);
  stripe.customers.retrieve.mockResolvedValue({
    id: "cus_settlement",
    deleted: false,
    metadata: {
      billingPurpose: "settlement_v1",
      settlementTeamId: "2",
      billingOwnerSupabaseUid: "uid-owner",
    },
  });
  stripe.subscriptions.list.mockResolvedValue({ data: [{ id: "sub_active", status: "active" }], has_more: false });
  (syncSettlementSubscription as jest.Mock).mockResolvedValue({ active: true });

  const response = await POST(request(), { params: { teamId: "2" } });

  expect(await response.json()).toMatchObject({ destination: "portal", active: true });
  expect(stripe.billingPortal.sessions.create).toHaveBeenCalled();
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
});

test("戻り確認は現在の課金担当者本人の成立済みCheckoutだけを反映する", async () => {
  (prisma.teamSettlementSubscription.findUnique as jest.Mock).mockResolvedValue({
    ...subscription,
    stripeCustomerId: "cus_settlement",
    team: { admin: { supabaseUid: "uid-owner" } },
  });
  stripe.checkout.sessions.retrieve.mockResolvedValue({
    id: "cs_complete",
    customer: "cus_settlement",
    client_reference_id: "2",
    mode: "subscription",
    status: "complete",
    payment_status: "paid",
    subscription: "sub_active",
    metadata: {
      billingPurpose: "settlement_v1",
      settlementTeamId: "2",
      billingOwnerSupabaseUid: "uid-owner",
    },
  });
  (syncSettlementSubscription as jest.Mock).mockResolvedValue({
    active: true,
    subscription: { status: "active" },
  });
  const getRequest = new NextRequest(
    "https://app.example/api/admin/teams/2/settlement-billing/checkout?session_id=cs_complete",
  );

  const response = await GET(getRequest, { params: { teamId: "2" } });

  expect(await response.json()).toMatchObject({ state: "active", active: true });
  expect(syncSettlementSubscription).toHaveBeenCalledWith("sub_active", expect.objectContaining({
    expectedTeamId: 2,
    checkoutSessionId: "cs_complete",
  }));
  expect(recordSettlementCheckoutConversion).toHaveBeenCalled();
});

test("担当者変更後は旧担当者のCheckoutを新担当者へ反映しない", async () => {
  (prisma.teamSettlementSubscription.findUnique as jest.Mock).mockResolvedValue({
    ...subscription,
    stripeCustomerId: "cus_settlement",
    team: { admin: { supabaseUid: "uid-new-owner" } },
  });
  const getRequest = new NextRequest(
    "https://app.example/api/admin/teams/2/settlement-billing/checkout?session_id=cs_complete",
  );

  const response = await GET(getRequest, { params: { teamId: "2" } });

  expect(response.status).toBe(403);
  expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
});
