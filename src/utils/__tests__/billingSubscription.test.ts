/** @jest-environment node */
import { recordCheckoutConversion } from "../billingSubscription";
import { prisma } from "@/lib/prisma";
import { trackServerEvent } from "@/utils/serverAnalytics";
import Stripe from "stripe";
jest.mock("@/lib/prisma", () => ({ prisma: { billingConversion: { createMany: jest.fn() } } }));
jest.mock("@/lib/stripe", () => ({ getStripeClient: jest.fn() }));
jest.mock("@/utils/serverAnalytics", () => ({ trackServerEvent: jest.fn() }));
const session = { id: "cs_1", mode: "subscription", status: "complete", payment_status: "paid", amount_total: 300, currency: "jpy", metadata: { conversionVersion: "1", interval: "month", source: "auto_assign" } } as unknown as Stripe.Checkout.Session;
const subscription = { id: "sub_1", status: "active" } as Stripe.Subscription;
beforeEach(() => jest.clearAllMocks());
test("契約IDの永続unique制約で再送時のGA二重計測を防ぐ", async () => {
  (prisma.billingConversion.createMany as jest.Mock).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
  await recordCheckoutConversion(session, 9, subscription);
  await recordCheckoutConversion(session, 9, subscription);
  expect(prisma.billingConversion.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true, data: [expect.objectContaining({ subscriptionId: "sub_1", checkoutId: "cs_1", value: 300 })] }));
  expect(trackServerEvent).toHaveBeenCalledTimes(1);
  expect(trackServerEvent).toHaveBeenCalledWith("purchase", expect.objectContaining({ value: 300, currency: "JPY", transaction_id: "sub_1" }), { adminId: 9 });
});
test("旧契約の復旧は新規購入として数えない", async () => {
  await recordCheckoutConversion({ ...session, metadata: {} }, 9, subscription);
  expect(prisma.billingConversion.createMany).not.toHaveBeenCalled();
});
test("未払いは購入として数えない", async () => {
  await recordCheckoutConversion({ ...session, payment_status: "unpaid" }, 9, subscription);
  expect(prisma.billingConversion.createMany).not.toHaveBeenCalled();
});
