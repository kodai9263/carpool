/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getStripeClient, getValidatedStripeProPriceId } from "@/lib/stripe";
import { syncBillingSubscription, recordCheckoutConversion } from "@/utils/billingSubscription";

jest.mock("@/utils/withAuth", () => ({ withAuth: (_request: unknown, handler: (id: number) => unknown) => handler(9) }));
jest.mock("@/utils/serverAnalytics", () => ({ trackServerEvent: jest.fn() }));
jest.mock("@/utils/billingSubscription", () => ({ syncBillingSubscription: jest.fn(), recordCheckoutConversion: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn(), $queryRaw: jest.fn(), admin: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() }, ride: { findFirst: jest.fn() } } }));
jest.mock("@/lib/stripe", () => ({ getValidatedStripeProPriceId: jest.fn().mockResolvedValue("price_month"), getStripeClient: jest.fn() }));
const admin = { id: 9, email: "test@example.com", billingPlan: "free", stripeCustomerId: "cus_owner" };
const stripe = {
  customers: { retrieve: jest.fn(), create: jest.fn() },
  subscriptions: { list: jest.fn(), retrieve: jest.fn() },
  checkout: { sessions: { list: jest.fn(), create: jest.fn(), retrieve: jest.fn(), expire: jest.fn() } },
  billingPortal: { sessions: { create: jest.fn() } },
};
const request = (body: object = {}) => new NextRequest("https://app.example/api/admin/billing/checkout", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.NEXT_PUBLIC_SITE_URL;
  (getStripeClient as jest.Mock).mockReturnValue(stripe);
  (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(prisma));
  (prisma.admin.findUnique as jest.Mock).mockResolvedValue(admin);
  (prisma.admin.findUniqueOrThrow as jest.Mock).mockResolvedValue(admin);
  stripe.customers.retrieve.mockResolvedValue({ id: "cus_owner" });
  stripe.subscriptions.list.mockResolvedValue({ data: [] });
  stripe.checkout.sessions.list.mockResolvedValue({ data: [] });
  stripe.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/test" });
  stripe.billingPortal.sessions.create.mockResolvedValue({ url: "https://billing.stripe.com/test" });
});

test("他人のCheckoutは反映しない", async () => {
  stripe.checkout.sessions.retrieve.mockResolvedValue({ customer: "cus_other", client_reference_id: "8", mode: "subscription" });
  const response = await GET(new NextRequest("https://app.example/api/admin/billing/checkout?session_id=cs_test_other"));
  expect(response.status).toBe(404);
  expect(syncBillingSubscription).not.toHaveBeenCalled();
});

test("未完了CheckoutはProにしない", async () => {
  stripe.checkout.sessions.retrieve.mockResolvedValue({ customer: "cus_owner", client_reference_id: "9", mode: "subscription", status: "open", payment_status: "unpaid" });
  const response = await GET(new NextRequest("https://app.example/api/admin/billing/checkout?session_id=cs_test_pending"));
  expect(await response.json()).toMatchObject({ isPro: false, state: "pending" });
  expect(syncBillingSubscription).not.toHaveBeenCalled();
});

test("本人の成立済みCheckoutのみ同期し計測する", async () => {
  stripe.checkout.sessions.retrieve.mockResolvedValue({ customer: "cus_owner", client_reference_id: "9", mode: "subscription", status: "complete", payment_status: "paid", subscription: "sub_1" });
  (syncBillingSubscription as jest.Mock).mockResolvedValue({ adminId: 9, subscription: { id: "sub_1", status: "active" } });
  const response = await GET(new NextRequest("https://app.example/api/admin/billing/checkout?session_id=cs_test_complete"));
  expect(await response.json()).toMatchObject({ isPro: true, state: "active" });
  expect(syncBillingSubscription).toHaveBeenCalledWith("sub_1", 9);
  expect(recordCheckoutConversion).toHaveBeenCalledTimes(1);
});

test.each(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"])("%s契約は追加申込ではなく支払管理へ", async (status) => {
  stripe.subscriptions.list.mockResolvedValue({ data: [{ status }] });
  const response = await POST(request());
  expect(await response.json()).toMatchObject({ destination: "portal" });
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
});

test("同じプランと戻り先の未決済セッションを再利用する", async () => {
  stripe.checkout.sessions.list.mockResolvedValue({ data: [{ id: "cs_open", mode: "subscription", url: "https://checkout.stripe.com/reused", metadata: { interval: "month", returnPath: "/admin/profile" } }] });
  const response = await POST(request());
  expect(await response.json()).toMatchObject({ url: "https://checkout.stripe.com/reused" });
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
});

test("再利用するときも他の未決済セッションを残さない", async () => {
  stripe.checkout.sessions.list.mockResolvedValue({ data: [
    { id: "cs_open", mode: "subscription", url: "https://checkout.stripe.com/reused", metadata: { interval: "month", returnPath: "/admin/profile" } },
    { id: "cs_duplicate", mode: "subscription" },
  ] });
  await POST(request());
  expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_duplicate");
  expect(stripe.checkout.sessions.expire).not.toHaveBeenCalledWith("cs_open");
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
});

test("外部戻り先は拒否してprofileへ、Stripe作成には冪等キーを付ける", async () => {
  await POST(request({ returnPath: "https://evil.example", source: "auto_assign" }));
  expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
    success_url: "https://app.example/admin/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}#plan",
    metadata: expect.objectContaining({ conversionVersion: "1", source: "auto_assign" }),
  }), expect.objectContaining({ idempotencyKey: expect.stringMatching(/^billing-checkout-/) }));
});

test("所有する配車へだけ戻す", async () => {
  (prisma.ride.findFirst as jest.Mock).mockResolvedValue({ id: 3 });
  await POST(request({ returnPath: "/admin/teams/2/rides/3" }));
  expect(prisma.ride.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 3, teamId: 2, team: { adminId: 9 } } }));
  expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ cancel_url: "https://app.example/admin/teams/2/rides/3?checkout=cancel" }), expect.any(Object));
});

test("別の管理者の配車へは戻さない", async () => {
  (prisma.ride.findFirst as jest.Mock).mockResolvedValue(null);
  await POST(request({ returnPath: "/admin/teams/88/rides/99" }));
  expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ cancel_url: "https://app.example/admin/profile?checkout=cancel#plan" }), expect.any(Object));
});

test("プラン切替時は以前のCheckoutを失効させる", async () => {
  stripe.checkout.sessions.list.mockResolvedValueOnce({ data: [{ id: "cs_old", mode: "subscription", metadata: { interval: "year", returnPath: "/admin/profile" } }] }).mockResolvedValueOnce({ data: [{ id: "cs_old" }] });
  await POST(request({ interval: "month" }));
  expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_old");
  expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
});


test("設定不備ならStripe顧客・Checkoutを作成しない", async () => {
  (getValidatedStripeProPriceId as jest.Mock).mockRejectedValueOnce(Object.assign(new Error("missing config"), { code: "BILLING_UNAVAILABLE" }));
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(stripe.customers.create).not.toHaveBeenCalled();
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

test("契約一覧取得後に別タブで成立した契約を見つけたら追加申込しない", async () => {
  stripe.checkout.sessions.list.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [{ id: "cs_finished", status: "complete", subscription: "sub_recent" }] });
  stripe.subscriptions.retrieve.mockResolvedValue({ status: "active" });
  const response = await POST(request());
  expect(await response.json()).toMatchObject({ destination: "portal" });
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
});
