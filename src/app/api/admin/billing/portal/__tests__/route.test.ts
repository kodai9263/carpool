/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
jest.mock("@/utils/withAuth", () => ({ withAuth: (_request: unknown, handler: (id: number) => unknown) => handler(9) }));
jest.mock("@/utils/serverAnalytics", () => ({ trackServerEvent: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: { admin: { findUnique: jest.fn() }, ride: { findFirst: jest.fn() } } }));
jest.mock("@/lib/stripe", () => ({ getStripeClient: jest.fn() }));
const create = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.NEXT_PUBLIC_SITE_URL;
  (getStripeClient as jest.Mock).mockReturnValue({ billingPortal: { sessions: { create } } });
  create.mockResolvedValue({ url: "https://billing.stripe.com/test" });
});
test("支払失敗でFreeへ戻った管理者も本人の支払管理を開ける", async () => {
  (prisma.admin.findUnique as jest.Mock).mockResolvedValue({ id: 9, billingPlan: "free", stripeCustomerId: "cus_own" });
  const response = await POST(new NextRequest("https://app.example/api/admin/billing/portal", { method: "POST", body: JSON.stringify({ returnPath: "//evil.example" }) }));
  expect(response.status).toBe(200);
  expect(create).toHaveBeenCalledWith({ customer: "cus_own", return_url: "https://app.example/admin/profile?portal=return#plan" });
});
test("Stripe顧客がなければ支払管理を作成しない", async () => {
  (prisma.admin.findUnique as jest.Mock).mockResolvedValue({ id: 9, billingPlan: "free", stripeCustomerId: null });
  const response = await POST(new NextRequest("https://app.example/api/admin/billing/portal", { method: "POST", body: "{}" }));
  expect(response.status).toBe(400);
  expect(create).not.toHaveBeenCalled();
});
