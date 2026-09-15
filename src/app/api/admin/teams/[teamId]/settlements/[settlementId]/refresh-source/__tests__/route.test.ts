/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";

jest.mock("@/utils/withAuth", () => ({
  withAuthTeam: jest.fn(async (_request: NextRequest, handler: (context: { teamId: number }) => Promise<Response>) => handler({ teamId: 2 })),
}));
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("@/utils/settlementAccess", () => ({
  ...jest.requireActual("@/utils/settlementAccess"),
  lockTeamSettlementAccess: jest.fn().mockResolvedValue({
    id: 1,
    teamId: 2,
    freeTrialSettlementId: 20,
    freeTrialConsumedAt: null,
  }),
  requireDraftAccess: jest.fn().mockImplementation(async (_tx, access) => access),
}));

const oldDraft = {
  allocationMethod: "equal",
  sourceFingerprint: "a".repeat(64),
  expenses: [{ id: "cost-1", category: "toll", description: "往復", amount: 1_000, payerMemberId: 99 }],
  families: [{ memberId: 99, memberName: "退団済み家族", isIncluded: true, children: [{ childId: 991, childName: "旧選手", isSelected: true, sourceStatus: "assigned" }] }],
};

const current = {
  id: 20, teamId: 2, rideId: 9, sourceDate: new Date("2026-09-20"), sourceDestination: "旧球場",
  sourceFingerprint: oldDraft.sourceFingerprint, sourceRideUpdatedAt: new Date("2026-09-12"),
  currency: "JPY", status: "draft", version: 1, currentRevisionNumber: null, draft: oldDraft,
  voidReason: null, createdByAdminId: 7, createdAt: new Date("2026-09-12"), updatedAt: new Date("2026-09-12"),
  ride: { updatedAt: new Date("2026-09-13") }, revisions: [], movements: [],
};

const request = new NextRequest("https://app.example/api/refresh-source", {
  method: "POST", body: JSON.stringify({ version: 1 }), headers: { "content-type": "application/json" },
});
const context = { params: { teamId: "2", settlementId: "20" } };

beforeEach(() => jest.clearAllMocks());

test("最新配車を同じチームで再取得し、退団済み立替元をチーム会計へ戻す", async () => {
  const ride = {
    id: 9, date: new Date("2026-09-21"), destination: "新球場", updatedAt: new Date("2026-09-13"),
    rideAssignments: [{ driver: { direction: "outbound" }, child: { id: 11, memberId: 1 } }],
    childAvailabilities: [{ childId: 11, availability: true, selfDriving: false }],
  };
  const tx = {
    rideSettlement: {
      findFirst: jest.fn().mockResolvedValue(current),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirstOrThrow: jest.fn().mockImplementation(async () => ({
        ...current, sourceDate: ride.date, sourceDestination: ride.destination,
        sourceRideUpdatedAt: ride.updatedAt, ride: { updatedAt: ride.updatedAt },
        version: 2, draft: (tx.rideSettlement.updateMany.mock.calls[0][0].data as { draft: unknown }).draft,
      })),
    },
    ride: { findFirst: jest.fn().mockResolvedValue(ride) },
    member: { findMany: jest.fn().mockResolvedValue([{ id: 1, guardians: [{ name: "田中" }], children: [{ id: 11, name: "太郎" }] }]) },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

  const response = await POST(request, context);

  expect(response.status).toBe(200);
  expect(tx.ride.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 9, teamId: 2 } }));
  expect(tx.rideSettlement.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 20, teamId: 2, version: 1 },
    data: expect.objectContaining({
      sourceDestination: "新球場",
      draft: expect.objectContaining({ expenses: [expect.objectContaining({ payerMemberId: null })] }),
    }),
  }));
});
