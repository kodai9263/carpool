/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import { consumeAutoAssignFreeUse, getAutoAssignBillingStatus } from "@/utils/billingServer";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    admin: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.BILLING_EXCLUDED_ADMIN_IDS = "";
});

test("30日無料体験中はPro機能を利用できる", async () => {
  (prisma.admin.findUnique as jest.Mock).mockResolvedValue({
    billingPlan: "free",
    proTrialEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    autoAssignTrialUsed: 3,
  });

  await expect(getAutoAssignBillingStatus(9)).resolves.toMatchObject({
    plan: "pro",
    isPro: true,
    isPaidPro: false,
    isTrialActive: true,
    accessSource: "trial",
    canUseAutoAssign: true,
  });
});

test("体験終了後はFreeの利用回数制限へ戻る", async () => {
  (prisma.admin.findUnique as jest.Mock).mockResolvedValue({
    billingPlan: "free",
    proTrialEndsAt: new Date(Date.now() - 1000),
    autoAssignTrialUsed: 3,
  });

  await expect(getAutoAssignBillingStatus(9)).resolves.toMatchObject({
    plan: "free",
    isPro: false,
    isTrialActive: false,
    accessSource: "free",
    canUseAutoAssign: false,
  });
});

test("無料体験中は自動割り当ての従来無料回数を消費しない", async () => {
  (prisma.admin.findUnique as jest.Mock).mockResolvedValue({
    billingPlan: "free",
    proTrialEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    autoAssignTrialUsed: 0,
  });

  await consumeAutoAssignFreeUse(9);

  expect(prisma.admin.update).not.toHaveBeenCalled();
});
