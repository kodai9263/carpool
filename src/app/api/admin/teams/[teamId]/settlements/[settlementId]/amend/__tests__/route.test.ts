/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";

jest.mock("@/utils/withAuth", () => ({
  withAuthTeam: jest.fn(async (_request: NextRequest, handler: (context: { teamId: number }) => Promise<Response>) => handler({ teamId: 2 })),
}));
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));

const snapshot = {
  source: { rideId: 9, date: "2026-09-20T00:00:00.000Z", destination: "県営球場" },
  allocationMethod: "equal",
  sourceFingerprint: "a".repeat(64),
  expenses: [{ id: "cost-1", category: "toll", description: "往復", amount: 1_000, payerMemberId: null }],
  families: [{ memberId: 1, memberName: "田中家", isIncluded: true, children: [{ childId: 11, childName: "太郎", isSelected: true, sourceStatus: "assigned" }] }],
  calculation: { totalCost: 1_000, totalWeight: 1, teamAdvanceAmount: 1_000, families: [{ memberId: 1, weight: 1, burdenAmount: 1_000, advanceAmount: 0, receivedNetAmount: 0, remainingAmount: 1_000 }], isComplete: false },
};

const settlement = {
  id: 20, teamId: 2, rideId: 9, sourceDate: new Date("2026-09-20"), sourceDestination: "県営球場",
  sourceFingerprint: snapshot.sourceFingerprint, currency: "JPY", status: "pending", version: 3,
  currentRevisionNumber: 1, draft: null, voidReason: null, createdByAdminId: 7,
  createdAt: new Date("2026-09-13"), updatedAt: new Date("2026-09-13"), movements: [],
  revisions: [{ id: 30, settlementId: 20, revision: 1, snapshot, totalAmount: 1_000, calculationVersion: "1", correctionReason: null, createdByAdminId: 7, createdAt: new Date("2026-09-13") }],
};

const request = (version = 3) => new NextRequest("https://app.example/api/amend", {
  method: "POST", body: JSON.stringify({ version }), headers: { "content-type": "application/json" },
});
const context = { params: { teamId: "2", settlementId: "20" } };

beforeEach(() => jest.clearAllMocks());

test("確定版の計算結果を除いて訂正下書きを作り、版競合を防ぐ", async () => {
  const tx = {
    rideSettlement: {
      findFirst: jest.fn().mockResolvedValue(settlement),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirstOrThrow: jest.fn().mockResolvedValue({ ...settlement, version: 4, draft: { ...snapshot, calculation: undefined } }),
    },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

  const response = await POST(request(), context);

  expect(response.status).toBe(200);
  expect(tx.rideSettlement.updateMany).toHaveBeenCalledWith({
    where: { id: 20, teamId: 2, version: 3 },
    data: {
      draft: expect.not.objectContaining({ calculation: expect.anything() }),
      version: { increment: 1 },
    },
  });
});

test("古い版番号では訂正下書きを作らない", async () => {
  const tx = { rideSettlement: { findFirst: jest.fn().mockResolvedValue(settlement), updateMany: jest.fn() } };
  (prisma.$transaction as jest.Mock).mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

  const response = await POST(request(2), context);

  expect(response.status).toBe(409);
  expect(tx.rideSettlement.updateMany).not.toHaveBeenCalled();
});
