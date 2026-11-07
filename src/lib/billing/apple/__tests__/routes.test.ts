/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET as configRoute } from "@/app/api/admin/billing/apple/config/route";
import { POST as purchaseRoute } from "@/app/api/admin/billing/apple/transactions/route";
import { POST as notificationRoute } from "@/app/api/billing/apple/notifications/route";
import { prisma } from "@/lib/prisma";
import { getAuthAdminId } from "@/utils/auth";
import { getAppleBillingConfig } from "../config";
import { verifyApplePurchase, verifyAppleNotification } from "../verification";
import { saveAppleSubscription, applyAppleNotification } from "../service";
import { AppleBillingError } from "../types";

jest.mock("@/utils/auth", () => ({ getAuthAdminId: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: { admin: { findUniqueOrThrow: jest.fn() } } }));
jest.mock("../config", () => ({ getAppleBillingConfig: jest.fn() }));
jest.mock("../verification", () => ({ verifyApplePurchase: jest.fn(), verifyAppleNotification: jest.fn() }));
jest.mock("../service", () => ({ saveAppleSubscription: jest.fn(), applyAppleNotification: jest.fn() }));

const uid = "11111111-1111-4111-8111-111111111111";
const admin = { id: 9, supabaseUid: uid, billingPlan: "free" };
const paid = { ...admin, appleProEnvironment: "Production", appleProAccountToken: uid, appleProExpiresAt: new Date(Date.now() + 86400000) };
const config = { products: { monthly: "pro.month", yearly: "pro.year" }, privateKey: "DO-NOT-EXPOSE", keyId: "private-key-id" };
const request = (body: unknown) => new NextRequest("https://app.example/api/apple", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  jest.resetAllMocks();
  delete process.env.APPLE_IAP_ENVIRONMENT;
  (getAuthAdminId as jest.Mock).mockResolvedValue(9);
  (prisma.admin.findUniqueOrThrow as jest.Mock).mockResolvedValue(admin);
  (getAppleBillingConfig as jest.Mock).mockReturnValue(config);
  (verifyApplePurchase as jest.Mock).mockResolvedValue({ transactionId: "100" });
  (saveAppleSubscription as jest.Mock).mockResolvedValue({ active: true });
});

test("購入設定には公開情報のみを返す", async () => {
  const response = await configRoute(new NextRequest("https://app.example/config"));
  const text = await response.text();
  expect(JSON.parse(text)).toEqual({ status: "OK", apple: {
    configured: true, canPurchase: true, appAccountToken: uid, products: config.products,
    hasAppleSubscription: false, hasWebSubscription: false,
  } });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(text).not.toContain("DO-NOT-EXPOSE");
  expect(text).not.toContain("private-key-id");
});
test("Apple設定不足では購入を開放しない", async () => {
  (getAppleBillingConfig as jest.Mock).mockReturnValue(null);
  const response = await configRoute(new NextRequest("https://app.example/config"));
  expect(await response.json()).toMatchObject({ apple: { configured: false, canPurchase: false, products: { monthly: "", yearly: "" } } });
});
test.each([
  { ...admin, billingPlan: "pro" }, paid,
  { ...admin, stripeSubscriptionId: "sub_pending", stripeSubscriptionStatus: "past_due" },
])("既存契約があれば二重購入を案内しない", async (current) => {
  (prisma.admin.findUniqueOrThrow as jest.Mock).mockResolvedValue(current);
  const response = await configRoute(new NextRequest("https://app.example/config"));
  expect(await response.json()).toMatchObject({ apple: { canPurchase: false } });
});
test("未契約者も購入を送信でき、サーバー保存後だけ成功を返す", async () => {
  (prisma.admin.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce(admin).mockResolvedValueOnce(paid);
  const response = await purchaseRoute(request({ transactionId: "100" }));
  expect(response.status).toBe(200);
  expect(verifyApplePurchase).toHaveBeenCalledWith({ transactionId: "100", signedTransaction: undefined }, uid);
  expect(saveAppleSubscription).toHaveBeenCalledWith(9, { transactionId: "100" });
  expect(await response.json()).toEqual({ status: "OK", mobileAccess: true });
});
test("保存失敗は再送可能な503で返し、購入完了を指示しない", async () => {
  (saveAppleSubscription as jest.Mock).mockRejectedValue(new Error("sensitive database details"));
  const response = await purchaseRoute(request({ transactionId: "100" }));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("sensitive");
});
test("別アカウントの購入は403で拒否し、保存しない", async () => {
  (verifyApplePurchase as jest.Mock).mockRejectedValue(new AppleBillingError("account_mismatch"));
  const response = await purchaseRoute(request({ transactionId: "100" }));
  expect(response.status).toBe(403);
  expect(saveAppleSubscription).not.toHaveBeenCalled();
});
test("未認証では購入検証・保存を実行しない", async () => {
  (getAuthAdminId as jest.Mock).mockResolvedValue(null);
  const response = await purchaseRoute(request({ transactionId: "100" }));
  expect(response.status).toBe(401);
  expect(verifyApplePurchase).not.toHaveBeenCalled();
});
test.each([{}, [], null, { transactionId: 123 }, { signedTransaction: 123 }, { signedTransaction: "x".repeat(256 * 1024) }])("不正・過大な購入リクエストは検証前に拒否する", async (body) => {
  expect((await purchaseRoute(request(body))).status).toBe(400);
  expect(verifyApplePurchase).not.toHaveBeenCalled();
});
test("偽の通知は保存前に拒否する", async () => {
  (verifyAppleNotification as jest.Mock).mockRejectedValue(new AppleBillingError("invalid_purchase"));
  expect((await notificationRoute(request({ signedPayload: "forged" }))).status).toBe(400);
  expect(applyAppleNotification).not.toHaveBeenCalled();
});
test("署名済み通知の最新状態を保存してから成功を返す", async () => {
  (verifyAppleNotification as jest.Mock).mockResolvedValue({ transaction: { transactionId: "100" } });
  expect((await notificationRoute(request({ signedPayload: "signed" }))).status).toBe(200);
  expect(applyAppleNotification).toHaveBeenCalledWith({ transactionId: "100" });
});
