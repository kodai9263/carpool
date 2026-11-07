/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "../route";
import { getAuthAdminId } from "@/utils/auth";
import { getAutoAssignBillingStatus } from "@/utils/billingServer";

jest.mock("@/utils/auth", () => ({ getAuthAdminId: jest.fn() }));
jest.mock("@/utils/billingServer", () => ({ getAutoAssignBillingStatus: jest.fn() }));

const request = () => new NextRequest("https://app.example/api/admin/billing/status");
const freeStatus = {
  plan: "free",
  isPro: false,
  isPaidPro: false,
  isTrialActive: false,
  accessSource: "free",
  trialEndsAt: null,
  trialDaysRemaining: 0,
  isExempt: false,
  freeLimit: 3,
  used: 0,
  remaining: 3,
  canUseAutoAssign: true,
};

beforeEach(() => {
  jest.resetAllMocks();
  (getAuthAdminId as jest.Mock).mockResolvedValue(9);
});

test.each([
  ["有料Pro", { plan: "pro", isPro: true, isPaidPro: true, accessSource: "paid" }, true],
  ["Freeの自動配車無料枠", {}, false],
  ["Webの30日無料体験", { plan: "pro", isPro: true, isTrialActive: true, accessSource: "trial" }, false],
  ["無料体験の期限切れ", { trialEndsAt: "2020-01-01T00:00:00.000Z", used: 3, remaining: 0, canUseAutoAssign: false }, false],
  ["自動配車の課金対象外", { isExempt: true }, false],
  ["有料判定がない旧データ", { plan: "pro", isPro: true, isPaidPro: undefined }, false],
  ["有料判定の不正な値", { plan: "pro", isPro: true, isPaidPro: "true" }, false],
])("%sでは明示的な有料判定だけでスマホ利用を返す", async (_label, overrides, mobileAccess) => {
  const autoAssign = { ...freeStatus, ...overrides };
  (getAutoAssignBillingStatus as jest.Mock).mockResolvedValue(autoAssign);

  const response = await GET(request());
  const body = await response.json();

  expect(getAutoAssignBillingStatus).toHaveBeenCalledWith(9);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(body.billing).toMatchObject({
    plan: autoAssign.plan,
    isPro: autoAssign.isPro,
    isTrialActive: autoAssign.isTrialActive,
    mobileAccess,
  });
  expect(body.autoAssign).toEqual(JSON.parse(JSON.stringify(autoAssign)));
});

test("未認証では契約情報を問い合わせず401を返す", async () => {
  (getAuthAdminId as jest.Mock).mockResolvedValue(null);

  const response = await GET(request());

  expect(response.status).toBe(401);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(getAutoAssignBillingStatus).not.toHaveBeenCalled();
  expect(await response.json()).not.toHaveProperty("billing");
});

test("契約情報の取得失敗を利用可能なレスポンスに置き換えない", async () => {
  (getAutoAssignBillingStatus as jest.Mock).mockRejectedValue(new Error("database unavailable"));

  const response = await GET(request());

  expect(response.status).toBe(500);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ message: "プラン情報の取得に失敗しました" });
});
