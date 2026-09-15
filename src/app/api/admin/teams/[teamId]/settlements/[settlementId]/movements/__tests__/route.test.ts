/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";

jest.mock("@/utils/withAuth", () => ({
  withAuthTeam: jest.fn(async (
    _request: NextRequest,
    handler: (context: { adminId: number; teamId: number }) => Promise<Response>,
  ) => handler({ adminId: 7, teamId: 2 })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: { $transaction: jest.fn() },
}));

const snapshot = {
  source: { rideId: 9, date: "2026-09-20T00:00:00.000Z", destination: "県営球場" },
  allocationMethod: "equal" as const,
  sourceFingerprint: "a".repeat(64),
  expenses: [{ id: "cost-1", category: "toll" as const, description: "往復", amount: 3_000, payerMemberId: 1 }],
  families: [
    { memberId: 1, memberName: "田中家", isIncluded: true, children: [{ childId: 11, childName: "太郎", isSelected: true, sourceStatus: "assigned" as const }] },
    { memberId: 2, memberName: "佐藤家", isIncluded: true, children: [{ childId: 21, childName: "一郎", isSelected: true, sourceStatus: "assigned" as const }] },
  ],
  calculation: {
    totalCost: 3_000,
    totalWeight: 2,
    teamAdvanceAmount: 0,
    families: [
      { memberId: 1, weight: 1, burdenAmount: 1_500, advanceAmount: 3_000, receivedNetAmount: 0, remainingAmount: -1_500 },
      { memberId: 2, weight: 1, burdenAmount: 1_500, advanceAmount: 0, receivedNetAmount: 0, remainingAmount: 1_500 },
    ],
    isComplete: false,
  },
};

type TestMovement = {
  id: number;
  settlementId: number;
  memberIdSnapshot: number;
  memberNameSnapshot: string;
  signedAmount: number;
  operationKey: string;
  note: string | null;
  reversesMovementId: number | null;
  createdByAdminId: number;
  createdAt: Date;
};

const baseSettlement = {
  id: 20,
  teamId: 2,
  rideId: 9,
  sourceDate: new Date("2026-09-20T00:00:00.000Z"),
  sourceDestination: "県営球場",
  sourceFingerprint: snapshot.sourceFingerprint,
  currency: "JPY",
  status: "pending",
  version: 3,
  currentRevisionNumber: 1,
  draft: null,
  createdByAdminId: 7,
  createdAt: new Date("2026-09-13T00:00:00.000Z"),
  updatedAt: new Date("2026-09-13T00:00:00.000Z"),
  revisions: [{
    id: 30,
    settlementId: 20,
    revision: 1,
    snapshot,
    totalAmount: 3_000,
    calculationVersion: "1",
    correctionReason: null,
    createdByAdminId: 7,
    createdAt: new Date("2026-09-13T00:00:00.000Z"),
  }],
  movements: [] as TestMovement[],
};

const request = (body: Record<string, unknown>) => new NextRequest(
  "https://app.example/api/admin/teams/2/settlements/20/movements",
  { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } },
);
const context = { params: { teamId: "2", settlementId: "20" } };

function transactionWith(current = baseSettlement) {
  const tx = {
    settlementMovement: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 40 }) },
    rideSettlement: {
      findFirst: jest.fn().mockResolvedValue(current),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirstOrThrow: jest.fn().mockResolvedValue({ ...current, version: 4 }),
    },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
  return tx;
}

beforeEach(() => jest.clearAllMocks());

test("返金を負数の追記として保存し、版番号を条件に更新する", async () => {
  const tx = transactionWith();
  const response = await POST(request({
    version: 3,
    operationKey: "refund-operation-1",
    memberId: 1,
    type: "refund",
    amount: 1_500,
  }), context);

  expect(response.status).toBe(200);
  expect(tx.rideSettlement.updateMany).toHaveBeenCalledWith({
    where: { id: 20, teamId: 2, version: 3 },
    data: { version: { increment: 1 }, status: "pending" },
  });
  expect(tx.settlementMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({
    memberIdSnapshot: 1,
    memberNameSnapshot: "田中家",
    signedAmount: -1_500,
    operationKey: "refund-operation-1",
  }) });
});

test("残額を超える受領を拒否する", async () => {
  const tx = transactionWith();
  const response = await POST(request({
    version: 3,
    operationKey: "receipt-operation-1",
    memberId: 2,
    type: "receipt",
    amount: 1_501,
  }), context);

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ message: "受領・返金額が現在の残額を超えています" });
  expect(tx.settlementMovement.create).not.toHaveBeenCalled();
});

test("画面用のtypeとamountがない通常記録を拒否する", async () => {
  const tx = transactionWith();
  const response = await POST(request({
    version: 3,
    operationKey: "receipt-operation-2",
    memberId: 2,
    signedAmount: 1_500,
  }), context);

  expect(response.status).toBe(400);
  expect(tx.rideSettlement.findFirst).not.toHaveBeenCalled();
});

test("同じ操作IDの再送では金銭移動を重複作成しない", async () => {
  const tx = transactionWith();
  tx.settlementMovement.findUnique.mockResolvedValue({ settlementId: 20 });
  const response = await POST(request({
    version: 3,
    operationKey: "receipt-operation-3",
    memberId: 2,
    type: "receipt",
    amount: 1_500,
  }), context);

  expect(response.status).toBe(200);
  expect(tx.settlementMovement.create).not.toHaveBeenCalled();
  expect(tx.rideSettlement.updateMany).not.toHaveBeenCalled();
});

test("古い版番号は409で拒否する", async () => {
  const tx = transactionWith();
  const response = await POST(request({
    version: 2,
    operationKey: "receipt-operation-4",
    memberId: 2,
    type: "receipt",
    amount: 1_500,
  }), context);

  expect(response.status).toBe(409);
  expect(tx.settlementMovement.create).not.toHaveBeenCalled();
});

test("取消中の最後の返金で取消完了にする", async () => {
  const received = {
    id: 41,
    settlementId: 20,
    memberIdSnapshot: 2,
    memberNameSnapshot: "佐藤家",
    signedAmount: 1_500,
    operationKey: "old-receipt",
    note: null,
    reversesMovementId: null,
    createdByAdminId: 7,
    createdAt: new Date("2026-09-13T00:00:00.000Z"),
  };
  const tx = transactionWith({ ...baseSettlement, status: "voiding", movements: [received] });

  const response = await POST(request({
    version: 3,
    operationKey: "void-refund-operation",
    memberId: 2,
    type: "refund",
    amount: 1_500,
  }), context);

  expect(response.status).toBe(200);
  expect(tx.rideSettlement.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "voided" }),
  }));
});
