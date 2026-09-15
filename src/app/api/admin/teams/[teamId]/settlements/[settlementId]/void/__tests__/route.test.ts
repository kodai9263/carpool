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
  allocationMethod: "equal", sourceFingerprint: "a".repeat(64),
  expenses: [{ id: "cost-1", category: "toll", description: "", amount: 1_000, payerMemberId: null }],
  families: [{ memberId: 1, memberName: "田中家", isIncluded: true, children: [{ childId: 11, childName: "太郎", isSelected: true, sourceStatus: "assigned" }] }],
  calculation: { totalCost: 1_000, totalWeight: 1, teamAdvanceAmount: 1_000, families: [{ memberId: 1, weight: 1, burdenAmount: 1_000, advanceAmount: 0, receivedNetAmount: 0, remainingAmount: 1_000 }], isComplete: false },
};

function settlement(movements: Array<Record<string, unknown>>) {
  return {
    id: 20, teamId: 2, rideId: 9, sourceDate: new Date("2026-09-20"), sourceDestination: "県営球場",
    sourceFingerprint: snapshot.sourceFingerprint, currency: "JPY", status: "completed", version: 3,
    currentRevisionNumber: 1, draft: null, voidReason: null, createdByAdminId: 7,
    createdAt: new Date("2026-09-13"), updatedAt: new Date("2026-09-13"), movements,
    revisions: [{ id: 30, settlementId: 20, revision: 1, snapshot, totalAmount: 1_000, calculationVersion: "1", correctionReason: null, createdByAdminId: 7, createdAt: new Date("2026-09-13") }],
  };
}

const request = (reason = "遠征中止") => new NextRequest("https://app.example/api/void", {
  method: "POST", body: JSON.stringify({ version: 3, reason }), headers: { "content-type": "application/json" },
});
const context = { params: { teamId: "2", settlementId: "20" } };

beforeEach(() => jest.clearAllMocks());

test("受領済みなら取消精算中にして実際の返金を待つ", async () => {
  const current = settlement([{ id: 40, settlementId: 20, memberIdSnapshot: 1, memberNameSnapshot: "田中家", signedAmount: 1_000, operationKey: "receipt-1", note: null, reversesMovementId: null, createdByAdminId: 7, createdAt: new Date("2026-09-13") }]);
  const tx = { rideSettlement: {
    findFirst: jest.fn().mockResolvedValue(current), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findFirstOrThrow: jest.fn().mockResolvedValue({ ...current, status: "voiding", version: 4, voidReason: "遠征中止" }),
  } };
  (prisma.$transaction as jest.Mock).mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

  const response = await POST(request(), context);

  expect(response.status).toBe(200);
  expect(tx.rideSettlement.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "voiding", voidReason: "遠征中止" }),
  }));
});

test("金銭移動がなければその場で取消完了にする", async () => {
  const current = settlement([]);
  const tx = { rideSettlement: {
    findFirst: jest.fn().mockResolvedValue(current), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findFirstOrThrow: jest.fn().mockResolvedValue({ ...current, status: "voided", version: 4, voidReason: "遠征中止" }),
  } };
  (prisma.$transaction as jest.Mock).mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

  await POST(request(), context);

  expect(tx.rideSettlement.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "voided" }),
  }));
});

test("取消理由なしをDB更新前に拒否する", async () => {
  const response = await POST(request(""), context);
  expect(response.status).toBe(400);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
