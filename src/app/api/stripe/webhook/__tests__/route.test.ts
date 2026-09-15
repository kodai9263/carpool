/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "../route";
import { getStripeClient } from "@/lib/stripe";
import { syncBillingSubscription } from "@/utils/billingSubscription";
import {
  markSettlementCheckoutReservation,
  recordSettlementCheckoutConversion,
  syncSettlementSubscription,
} from "@/utils/settlementBilling";

jest.mock("@/lib/prisma", () => ({
  prisma: { admin: { findFirst: jest.fn() } },
}));
jest.mock("@/lib/stripe", () => ({
  getStripeClient: jest.fn(),
  getStripeWebhookSecret: jest.fn(() => "whsec_test"),
}));
jest.mock("@/utils/billingSubscription", () => ({
  syncBillingSubscription: jest.fn(),
  recordCheckoutConversion: jest.fn(),
}));
jest.mock("@/utils/settlementBilling", () => ({
  SETTLEMENT_BILLING_PURPOSE: "settlement_v1",
  syncSettlementSubscription: jest.fn(),
  markSettlementCheckoutReservation: jest.fn(),
  recordSettlementCheckoutConversion: jest.fn(),
}));

const stripe = {
  webhooks: { constructEvent: jest.fn() },
  checkout: { sessions: { retrieve: jest.fn() } },
};

const request = () => new NextRequest("https://app.example/api/stripe/webhook", {
  method: "POST",
  headers: { "stripe-signature": "signature" },
  body: "payload",
});

beforeEach(() => {
  jest.clearAllMocks();
  (getStripeClient as jest.Mock).mockReturnValue(stripe);
});

test("精算Checkout完了はチーム契約として同期する", async () => {
  stripe.webhooks.constructEvent.mockReturnValue({
    id: "evt_checkout",
    type: "checkout.session.completed",
    created: 100,
    data: { object: { id: "cs_settlement" } },
  });
  stripe.checkout.sessions.retrieve.mockResolvedValue({
    id: "cs_settlement",
    mode: "subscription",
    subscription: "sub_settlement",
    client_reference_id: "2",
    metadata: { billingPurpose: "settlement_v1", settlementTeamId: "2" },
  });
  (syncSettlementSubscription as jest.Mock).mockResolvedValue({
    teamId: 2,
    active: true,
    subscription: { id: "sub_settlement" },
  });

  const response = await POST(request());

  expect(response.status).toBe(200);
  expect(syncSettlementSubscription).toHaveBeenCalledWith("sub_settlement", {
    expectedTeamId: 2,
    checkoutSessionId: "cs_settlement",
    event: { id: "evt_checkout", type: "checkout.session.completed", created: 100 },
  });
  expect(syncBillingSubscription).not.toHaveBeenCalled();
  expect(recordSettlementCheckoutConversion).toHaveBeenCalled();
});

test("精算契約でなければ既存Pro契約の同期へ渡す", async () => {
  stripe.webhooks.constructEvent.mockReturnValue({
    id: "evt_legacy",
    type: "customer.subscription.updated",
    created: 200,
    data: { object: { id: "sub_pro" } },
  });
  (syncSettlementSubscription as jest.Mock).mockResolvedValue(null);

  await POST(request());

  expect(syncSettlementSubscription).toHaveBeenCalledWith("sub_pro", {
    event: { id: "evt_legacy", type: "customer.subscription.updated", created: 200 },
  });
  expect(syncBillingSubscription).toHaveBeenCalledWith("sub_pro");
});

test.each([
  ["checkout.session.expired", "expired"],
  ["checkout.session.async_payment_failed", "failed"],
] as const)("%sでCheckout予約を%sにする", async (eventType, status) => {
  stripe.webhooks.constructEvent.mockReturnValue({
    id: `evt_${status}`,
    type: eventType,
    created: 300,
    data: { object: { id: "cs_settlement" } },
  });

  await POST(request());

  expect(markSettlementCheckoutReservation).toHaveBeenCalledWith("cs_settlement", status);
});
