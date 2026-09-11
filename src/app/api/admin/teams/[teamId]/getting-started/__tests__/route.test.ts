/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "../route";
import { prisma } from "@/lib/prisma";
import { getAuthAdminIdWithTeam } from "@/utils/auth";

jest.mock("@/utils/auth", () => ({ getAuthAdminIdWithTeam: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: {
  member: { count: jest.fn() },
  child: { count: jest.fn() },
  ride: { findFirst: jest.fn() },
} }));
const request = () => new NextRequest("https://app.example/api/admin/teams/2/getting-started");
const context = { params: { teamId: "2" } };

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-09-10T03:00:00.000Z"));
  (getAuthAdminIdWithTeam as jest.Mock).mockResolvedValue(9);
  (prisma.member.count as jest.Mock).mockResolvedValue(4);
  (prisma.child.count as jest.Mock).mockResolvedValue(6);
  (prisma.ride.findFirst as jest.Mock).mockResolvedValue({
    id: 12, date: new Date("2026-09-10T00:00:00.000Z"), destination: "体育館", _count: { availabilityDrivers: 2, rideAssignments: 0 },
  });
});
afterEach(() => jest.useRealTimers());

test("所有権確認を通過したチームだけ取得し、必要な件数と配車情報だけ返す", async () => {
  const response = await GET(request(), context);
  expect(getAuthAdminIdWithTeam).toHaveBeenCalledWith(expect.any(NextRequest), 2);
  expect(prisma.member.count).toHaveBeenCalledWith({ where: { teamId: 2 } });
  expect(prisma.child.count).toHaveBeenCalledWith({ where: { member: { teamId: 2 } } });
  expect(await response.json()).toEqual({ memberCount: 4, childCount: 6, ride: { id: 12, date: "2026-09-10T00:00:00.000Z", destination: "体育館", driverCount: 2, isAnswerLocked: false, hasSavedAssignments: false } });
});

test("他人のチームは認証ラッパーが拒否し、状況を読み取らない", async () => {
  (getAuthAdminIdWithTeam as jest.Mock).mockResolvedValue(null);
  const response = await GET(request(), context);
  expect(response.status).toBe(401);
  expect(prisma.member.count).not.toHaveBeenCalled();
  expect(prisma.ride.findFirst).not.toHaveBeenCalled();
});

test("不正なチームIDは認証照会前に拒否する", async () => {
  const response = await GET(request(), { params: { teamId: "invalid" } });
  expect(response.status).toBe(400);
  expect(getAuthAdminIdWithTeam).not.toHaveBeenCalled();
});

test.each([
  ["2026-09-09T14:59:59.999Z", "2026-09-08T15:00:00.000Z"],
  ["2026-09-09T15:00:00.000Z", "2026-09-09T15:00:00.000Z"],
])("JSTの日付境界 %s から最も近い配車を探す", async (now, start) => {
  jest.setSystemTime(new Date(now));
  await GET(request(), context);
  expect(prisma.ride.findFirst).toHaveBeenCalledWith(expect.objectContaining({
    where: { teamId: 2, date: { gte: new Date(start) } },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  }));
});

test("候補数は自動割当本体と同じ運転可の回答だけ数える", async () => {
  await GET(request(), context);
  expect(prisma.ride.findFirst).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({
    _count: { select: { rideAssignments: true, availabilityDrivers: { where: { teamId: 2, type: "driver", availability: true } } } },
  }) }));
});

test.each([[0, false], [1, true], [12, true]])("保存済み割当%s件を試用回数やプランに依存せず返す", async (count, expected) => {
  (prisma.ride.findFirst as jest.Mock).mockResolvedValue({
    id: 12, date: new Date("2026-09-10T00:00:00.000Z"), destination: "体育館",
    _count: { availabilityDrivers: 2, rideAssignments: count },
  });
  const response = await GET(request(), context);
  expect((await response.json()).ride.hasSavedAssignments).toBe(expected);
});

test("まだ配車がなければnullを返す", async () => {
  (prisma.ride.findFirst as jest.Mock).mockResolvedValue(null);
  const response = await GET(request(), context);
  expect((await response.json()).ride).toBeNull();
});

test("DB障害を未着手の正常応答にしない", async () => {
  (prisma.ride.findFirst as jest.Mock).mockRejectedValue(new Error("connection failed"));
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await GET(request(), context);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "初回利用状況を取得できませんでした" });
  } finally {
    errorSpy.mockRestore();
  }
});


test.each([[true, true], [false, false]])("未来配車でも回答期限切れ時のlock設定%sを返す", async (lockAfterDeadline, expected) => {
  (prisma.ride.findFirst as jest.Mock).mockResolvedValue({
    id: 12, date: new Date("2026-09-12T00:00:00.000Z"), destination: "体育館",
    deadline: new Date("2026-09-09T00:00:00.000Z"), lockAfterDeadline,
    _count: { availabilityDrivers: 0, rideAssignments: 0 },
  });
  const response = await GET(request(), context);
  expect((await response.json()).ride.isAnswerLocked).toBe(expected);
});
