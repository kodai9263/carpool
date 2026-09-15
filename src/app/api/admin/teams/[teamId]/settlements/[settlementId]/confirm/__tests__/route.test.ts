/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { consumeFreeTrial, lockTeamSettlementAccess, requireDraftAccess } from "@/utils/settlementAccess";

jest.mock("@/utils/withAuth", () => ({
  withAuthTeam: jest.fn(async (
    _request: NextRequest,
    handler: (context: { adminId: number; teamId: number }) => Promise<Response>,
  ) => handler({ adminId: 7, teamId: 2 })),
}));

jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));

jest.mock("@/utils/settlementAccess", () => ({
  ...jest.requireActual("@/utils/settlementAccess"),
  lockTeamSettlementAccess: jest.fn(),
  requireDraftAccess: jest.fn(),
  consumeFreeTrial: jest.fn(),
}));

jest.mock("@/utils/settlementServer", () => ({
  ...jest.requireActual("@/utils/settlementServer"),
  settlementDetailInclude: {},
  parseSettlementVersion: jest.fn((value) => Number(value)),
  parseStoredDraft: jest.fn(() => ({ families: [], expenses: [] })),
  createSettlementSnapshot: jest.fn(() => ({ calculation: { totalCost: 1000 } })),
  calculateSnapshotWithMovements: jest.fn(() => ({ isComplete: false })),
  buildSettlementDetail: jest.fn((settlement) => ({ id: settlement.id })),
}));

const access = {
  id: 1,
  teamId: 2,
  freeTrialSettlementId: 20,
  freeTrialConsumedAt: null,
};

function request(body: Record<string, unknown>) {
  return new NextRequest(
    "https://app.example/api/admin/teams/2/settlements/20/confirm",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function transaction(currentRevisionNumber: number | null) {
  const current = {
    id: 20,
    teamId: 2,
    rideId: 9,
    version: 0,
    currentRevisionNumber,
    draft: {},
    status: "draft",
    sourceDate: new Date("2026-09-20T00:00:00.000Z"),
    sourceDestination: "県営球場",
    sourceRideUpdatedAt: null,
    ride: null,
    movements: [],
  };
  const confirmed = { ...current, version: 1, currentRevisionNumber: (currentRevisionNumber ?? 0) + 1 };
  const tx = {
    rideSettlement: {
      findFirst: jest.fn().mockResolvedValue(current),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirstOrThrow: jest.fn().mockResolvedValue(confirmed),
    },
    settlementRevision: { create: jest.fn().mockResolvedValue({ id: 1 }) },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
  return tx;
}

beforeEach(() => {
  jest.clearAllMocks();
  (lockTeamSettlementAccess as jest.Mock).mockResolvedValue(access);
  (requireDraftAccess as jest.Mock).mockResolvedValue(access);
});

test("初回確定では改訂を保存した後に無料枠を同じ取引内で消化する", async () => {
  const tx = transaction(null);

  const response = await POST(request({ version: 0 }), {
    params: { teamId: "2", settlementId: "20" },
  });

  expect(response.status).toBe(200);
  expect(tx.settlementRevision.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ settlementId: 20, revision: 1, totalAmount: 1000 }),
  }));
  expect(consumeFreeTrial).toHaveBeenCalledWith(tx, access, 20);
  expect((consumeFreeTrial as jest.Mock).mock.invocationCallOrder[0]).toBeGreaterThan(
    tx.settlementRevision.create.mock.invocationCallOrder[0],
  );
});

test("確定済み精算の訂正では無料枠を再消化しない", async () => {
  transaction(1);

  const response = await POST(request({ version: 0, correctionReason: "駐車料金を訂正" }), {
    params: { teamId: "2", settlementId: "20" },
  });

  expect(response.status).toBe(200);
  expect(requireDraftAccess).toHaveBeenCalled();
  expect(consumeFreeTrial).not.toHaveBeenCalled();
});

test("契約中に無料対象外の遠征を初回確定しても無料枠を消化しない", async () => {
  transaction(null);
  (requireDraftAccess as jest.Mock).mockResolvedValue({
    ...access,
    freeTrialSettlementId: 19,
    subscriptionStatus: "active",
  });

  const response = await POST(request({ version: 0 }), {
    params: { teamId: "2", settlementId: "20" },
  });

  expect(response.status).toBe(200);
  expect(consumeFreeTrial).not.toHaveBeenCalled();
});
