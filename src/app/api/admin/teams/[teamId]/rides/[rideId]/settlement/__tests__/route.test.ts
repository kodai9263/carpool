/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { assignFreeTrialOrThrow, SettlementAccessError } from "@/utils/settlementAccess";

jest.mock("@/utils/withAuth", () => ({
  withAuthTeam: jest.fn(async (
    _request: NextRequest,
    handler: (context: { adminId: number; teamId: number }) => Promise<Response>,
  ) => handler({ adminId: 7, teamId: 2 })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: { $transaction: jest.fn(), rideSettlement: { findFirst: jest.fn() } },
}));
jest.mock("@/utils/settlementAccess", () => ({
  ...jest.requireActual("@/utils/settlementAccess"),
  lockTeamSettlementAccess: jest.fn().mockResolvedValue({
    id: 1,
    teamId: 2,
    freeTrialSettlementId: null,
    freeTrialConsumedAt: null,
  }),
  assignFreeTrialOrThrow: jest.fn().mockImplementation(async (_tx, access) => access),
}));

const request = () => new NextRequest(
  "https://app.example/api/admin/teams/2/rides/9/settlement",
  { method: "POST" },
);
const context = { params: { teamId: "2", rideId: "9" } };

function transaction() {
  const tx = {
    rideSettlement: { findFirst: jest.fn().mockResolvedValue(null), findFirstOrThrow: jest.fn(), create: jest.fn() },
    ride: { findFirst: jest.fn() },
    member: { findMany: jest.fn() },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
  return tx;
}

beforeEach(() => jest.clearAllMocks());

test("配車が認証済みチームに属するかIDとteamIdの両方で確認する", async () => {
  const tx = transaction();
  tx.ride.findFirst.mockResolvedValue(null);

  const response = await POST(request(), context);

  expect(response.status).toBe(404);
  expect(tx.ride.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 9, teamId: 2 } }));
  expect(tx.member.findMany).not.toHaveBeenCalled();
  expect(tx.rideSettlement.create).not.toHaveBeenCalled();
});

test("同じ配車の精算があれば新規作成せず再利用する", async () => {
  const tx = transaction();
  tx.rideSettlement.findFirst.mockResolvedValue({
    id: 20,
    teamId: 2,
    rideId: 9,
    sourceDate: new Date("2026-09-20T00:00:00.000Z"),
    sourceDestination: "県営球場",
    sourceFingerprint: "a".repeat(64),
    currency: "JPY",
    status: "draft",
    version: 0,
    currentRevisionNumber: null,
    draft: {
      allocationMethod: "equal",
      sourceFingerprint: "a".repeat(64),
      expenses: [],
      families: [{ memberId: 1, memberName: "田中家", isIncluded: false, children: [] }],
    },
    createdByAdminId: 7,
    createdAt: new Date("2026-09-13T00:00:00.000Z"),
    updatedAt: new Date("2026-09-13T00:00:00.000Z"),
    revisions: [],
    movements: [],
  });
  tx.rideSettlement.findFirstOrThrow.mockImplementation(async () => tx.rideSettlement.findFirst.mock.results[0].value);

  const response = await POST(request(), context);
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.created).toBe(false);
  expect(body.settlement.id).toBe(20);
  expect(tx.ride.findFirst).not.toHaveBeenCalled();
  expect(tx.rideSettlement.create).not.toHaveBeenCalled();
});

test("別遠征で無料体験中なら課金案内に必要な情報を返す", async () => {
  const tx = transaction();
  tx.rideSettlement.findFirst.mockResolvedValue({
    id: 20,
    teamId: 2,
    currentRevisionNumber: null,
  });
  (assignFreeTrialOrThrow as jest.Mock).mockRejectedValueOnce(
    new SettlementAccessError("trial_in_use", 19),
  );

  const response = await POST(request(), context);
  const body = await response.json();

  expect(response.status).toBe(402);
  expect(body).toMatchObject({
    code: "SETTLEMENT_SUBSCRIPTION_REQUIRED",
    reason: "trial_in_use",
    freeTrialSettlementId: 19,
    monthlyPrice: 980,
  });
});
