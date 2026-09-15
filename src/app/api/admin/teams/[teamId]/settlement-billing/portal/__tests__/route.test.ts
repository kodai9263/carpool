/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

jest.mock("@/utils/withAuth", () => ({
  withAuthTeam: jest.fn(async (
    _request: NextRequest,
    handler: (context: { adminId: number; teamId: number }) => Promise<Response>,
  ) => handler({ adminId: 9, teamId: 2 })),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    teamSettlementSubscription: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/stripe", () => ({ getStripeClient: jest.fn() }));

const stripe = {
  customers: { retrieve: jest.fn() },
  billingPortal: { sessions: { create: jest.fn() } },
};
const request = () => new NextRequest(
  "https://app.example/api/admin/teams/2/settlement-billing/portal",
  { method: "POST", body: JSON.stringify({}) },
);

function local(ownerUid = "uid-owner") {
  return {
    billingAdminId: 9,
    billingOwnerSupabaseUid: "uid-owner",
    stripeCustomerId: "cus_settlement",
    team: {
      admin: {
        supabaseUid: ownerUid,
        pendingTransferNewEmail: null,
        pendingTransferNewSupabaseUid: null,
      },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (getStripeClient as jest.Mock).mockReturnValue(stripe);
  (prisma.teamSettlementSubscription.findUnique as jest.Mock).mockResolvedValue(local());
  stripe.customers.retrieve.mockResolvedValue({
    deleted: false,
    metadata: {
      billingPurpose: "settlement_v1",
      settlementTeamId: "2",
      billingOwnerSupabaseUid: "uid-owner",
    },
  });
  stripe.billingPortal.sessions.create.mockResolvedValue({ url: "https://billing.stripe.com/test" });
});

test("現在の課金担当者だけが精算専用Portalを開ける", async () => {
  const response = await POST(request(), { params: { teamId: "2" } });

  expect(await response.json()).toMatchObject({ url: "https://billing.stripe.com/test" });
  expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
    customer: "cus_settlement",
    return_url: expect.stringContaining("settlement_portal=return"),
  });
});

test("担当者変更後は旧担当者のPortalを新担当者へ渡さない", async () => {
  (prisma.teamSettlementSubscription.findUnique as jest.Mock).mockResolvedValue(local("uid-new-owner"));

  const response = await POST(request(), { params: { teamId: "2" } });

  expect(response.status).toBe(403);
  expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
});

test("担当者引継ぎ中はPortalを開かない", async () => {
  const subscription = local();
  (subscription.team.admin as { pendingTransferNewEmail: string | null }).pendingTransferNewEmail = "next@example.com";
  (prisma.teamSettlementSubscription.findUnique as jest.Mock).mockResolvedValue(subscription);

  const response = await POST(request(), { params: { teamId: "2" } });

  expect(response.status).toBe(409);
  expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
});
