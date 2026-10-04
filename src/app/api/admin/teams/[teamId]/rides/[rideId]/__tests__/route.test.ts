/** @jest-environment node */
import { NextRequest } from "next/server";
import { PUT } from "../route";
import { prisma } from "@/lib/prisma";

jest.mock("@/utils/withAuth", () => ({
  withAdminTeamRide: jest.fn(async (
    _request: NextRequest,
    handler: (context: { adminId: number; teamId: number; rideId: number }) => Promise<Response>,
  ) => handler({ adminId: 7, teamId: 2, rideId: 9 })),
}));

jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));

const context = { params: { teamId: "2", rideId: "9" } };
const updatedAt = "2026-09-30T00:00:00.000Z";
const payload = {
  date: "2026-10-01T00:00:00.000Z",
  destination: "球場",
  meetingPlace: "学校",
  separateDirections: false,
  expectedUpdatedAt: updatedAt,
  drivers: [{
    availabilityDriverId: 11,
    type: "driver",
    direction: "outbound",
    seats: 4,
    rideAssignments: [{ childId: 21 }],
    escorts: [],
  }],
};

const request = (body: unknown) => new NextRequest(
  "https://app.example/api/admin/teams/2/rides/9",
  { method: "PUT", body: JSON.stringify(body) },
);

function transaction() {
  const tx = {
    availabilityDriver: { findMany: jest.fn().mockResolvedValue([{ id: 11, type: "driver", direction: "both", availability: true, seats: 4 }]) },
    child: { findMany: jest.fn().mockResolvedValue([{ id: 21 }]) },
    ride: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    rideAssignment: { deleteMany: jest.fn(), createMany: jest.fn() },
    driver: {
      deleteMany: jest.fn(),
      createManyAndReturn: jest.fn().mockResolvedValue([{ id: 31, availabilityDriverId: 11, direction: "outbound" }]),
    },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
  return tx;
}

beforeEach(() => jest.clearAllMocks());

test("更新時刻が古ければ既存の割り当てを削除せず409を返す", async () => {
  const tx = transaction();
  tx.ride.updateMany.mockResolvedValue({ count: 0 });

  const response = await PUT(request(payload), context);

  expect(response.status).toBe(409);
  expect(tx.ride.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 9, teamId: 2, updatedAt: new Date(updatedAt) },
  }));
  expect(tx.rideAssignment.deleteMany).not.toHaveBeenCalled();
  expect(tx.driver.deleteMany).not.toHaveBeenCalled();
});

test("別の配車の回答IDは削除前に拒否する", async () => {
  const tx = transaction();
  tx.availabilityDriver.findMany.mockResolvedValue([]);

  const response = await PUT(request(payload), context);

  expect(response.status).toBe(400);
  expect(tx.availabilityDriver.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: { in: [11] }, rideId: 9, teamId: 2 },
  }));
  // 親レコードを先にロックするが、例外でトランザクション全体が戻る。
  expect(tx.ride.updateMany).toHaveBeenCalled();
  expect(tx.rideAssignment.deleteMany).not.toHaveBeenCalled();
});

test("同じ方向に同じ子どもを二重割り当てしない", async () => {
  const tx = transaction();
  const duplicate = {
    ...payload,
    drivers: [{ ...payload.drivers[0], rideAssignments: [{ childId: 21 }, { childId: 21 }] }],
  };

  const response = await PUT(request(duplicate), context);

  expect(response.status).toBe(400);
  expect(prisma.$transaction).not.toHaveBeenCalled();
  expect(tx.rideAssignment.deleteMany).not.toHaveBeenCalled();
});

test("正しい配車は既存の割り当てを更新できる", async () => {
  const tx = transaction();

  const response = await PUT(request(payload), context);

  expect(response.status).toBe(200);
  expect(tx.rideAssignment.deleteMany).toHaveBeenCalledWith({ where: { rideId: 9 } });
  expect(tx.rideAssignment.createMany).toHaveBeenCalledWith({
    data: [{ rideId: 9, driverId: 31, childId: 21 }],
  });
});

test("座席を超える割り当ては既存データの削除前に拒否する", async () => {
  const tx = transaction();
  tx.availabilityDriver.findMany.mockResolvedValue([
    { id: 11, type: "driver", direction: "both", availability: true, seats: 1 },
    { id: 12, type: "escort", direction: "both", availability: true, seats: 0 },
  ]);
  const response = await PUT(request({
    ...payload,
    drivers: [{ ...payload.drivers[0], escorts: [{ availabilityDriverId: 12, direction: "outbound", rideAssignments: [] }] }],
  }), context);

  expect(response.status).toBe(400);
  expect((await response.json()).message).toMatch(/座席数/);
  expect(tx.rideAssignment.deleteMany).not.toHaveBeenCalled();
});

test("回答IDが違っても同じ保護者の運転・引率兼任を拒否する", async () => {
  const tx = transaction();
  tx.availabilityDriver.findMany.mockResolvedValue([
    { id: 11, guardianId: 5, type: "driver", direction: "both", availability: true, seats: 4 },
    { id: 12, guardianId: 5, type: "escort", direction: "both", availability: true, seats: 0 },
  ]);
  const response = await PUT(request({
    ...payload,
    drivers: [{ ...payload.drivers[0], escorts: [{ availabilityDriverId: 12, direction: "outbound", rideAssignments: [] }] }],
  }), context);
  expect(response.status).toBe(400);
  expect((await response.json()).message).toMatch(/同じ保護者/);
  expect(tx.rideAssignment.deleteMany).not.toHaveBeenCalled();
});

describe.each(["driver", "escort"] as const)("%sの回答方向を保存前に確認する", (role) => {
  test.each([
    [false, "outbound", "both", 200],
    [false, "outbound", "outbound", 400],
    [false, "outbound", "inbound", 400],
    [true, "outbound", "both", 200],
    [true, "outbound", "outbound", 200],
    [true, "outbound", "inbound", 400],
    [true, "inbound", "both", 200],
    [true, "inbound", "inbound", 200],
    [true, "inbound", "outbound", 400],
  ] as const)("分離=%s、配車=%s、回答=%s → %s", async (separateDirections, direction, answerDirection, status) => {
    const tx = transaction();
    tx.availabilityDriver.findMany.mockResolvedValue([
      { id: 11, guardianId: 5, type: "driver", direction: role === "driver" ? answerDirection : "both", availability: true, seats: 4 },
      { id: 12, guardianId: 6, type: "escort", direction: role === "escort" ? answerDirection : "both", availability: true, seats: 0 },
    ]);
    tx.child.findMany.mockResolvedValue([{ id: 21 }, { id: 22 }]);
    tx.driver.createManyAndReturn
      .mockResolvedValueOnce([{ id: 31, availabilityDriverId: 11, direction }])
      .mockResolvedValueOnce([{ id: 32, availabilityDriverId: 12, direction }]);
    const response = await PUT(request({
      ...payload,
      separateDirections,
      drivers: [{
        ...payload.drivers[0], direction,
        escorts: [{ availabilityDriverId: 12, direction, rideAssignments: [{ childId: 22 }] }],
      }],
    }), context);

    expect(response.status).toBe(status);
    if (status === 400) {
      expect(tx.rideAssignment.deleteMany).not.toHaveBeenCalled();
      expect(tx.driver.deleteMany).not.toHaveBeenCalled();
    } else {
      expect(tx.driver.createManyAndReturn).toHaveBeenNthCalledWith(1, expect.objectContaining({
        data: [{ rideId: 9, availabilityDriverId: 11, type: "driver", direction }],
      }));
      expect(tx.rideAssignment.createMany).toHaveBeenCalledWith({
        data: [{ rideId: 9, driverId: 32, childId: 22 }],
      });
    }
  });
});
