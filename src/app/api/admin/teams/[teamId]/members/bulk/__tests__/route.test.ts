/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getAuthAdminIdWithTeam } from "@/utils/auth";
import { trackServerEvent } from "@/utils/serverAnalytics";
jest.mock("@/utils/auth", () => ({ getAuthAdminIdWithTeam: jest.fn() }));
jest.mock("@/utils/serverAnalytics", () => ({ trackServerEvent: jest.fn() }));
jest.mock("@/utils/gradeUtils", () => ({ getCurrentSchoolYear: () => 2026 }));
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn(), team: { findFirst: jest.fn(), update: jest.fn() }, member: { findMany: jest.fn(), create: jest.fn() } } }));
const family = { guardianName: "保護者", childName: "子ども", grade: 3 };
const request = (families: unknown = [family]) => new NextRequest("https://app.example/api/admin/teams/2/members/bulk", { method: "POST", body: JSON.stringify({ families }) });
const ctx = { params: { teamId: "2" } };
beforeEach(() => {
  jest.clearAllMocks();
  (getAuthAdminIdWithTeam as jest.Mock).mockResolvedValue(9);
  (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(prisma));
  (prisma.team.findFirst as jest.Mock).mockResolvedValue({ maxGrade: 6 });
  (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.member.create as jest.Mock).mockResolvedValue({ id: 1 });
});
test("所有者だけがSerializable内で全家族作成と子ども数加算を行う", async () => {
  const response = await POST(request([family, { ...family, childName: "次の子", grade: null }]), ctx);
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ status: "OK", families: 2, children: 2 });
  expect(getAuthAdminIdWithTeam).toHaveBeenCalledWith(expect.any(NextRequest), 2);
  expect(prisma.team.findFirst).toHaveBeenCalledWith({ where: { id: 2, adminId: 9 }, select: { maxGrade: true } });
  expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
  expect(prisma.member.create).toHaveBeenCalledWith(expect.objectContaining({ data: { teamId: 2, guardians: { create: { name: "保護者" } }, children: { create: { name: "次の子", grade: null, gradeYear: 2026 } } } }));
  expect(prisma.team.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { memberCount: { increment: 2 } } });
  expect(trackServerEvent).toHaveBeenCalledWith("member_bulk_created", { family_count: 2, child_count: 2 }, { adminId: 9, request: expect.any(NextRequest) });
});
test("所有権がなければDB処理しない", async () => {
  (getAuthAdminIdWithTeam as jest.Mock).mockResolvedValue(null);
  expect((await POST(request(), ctx)).status).toBe(401);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
test("チームの学年上限で入力を拒否し作成しない", async () => {
  (prisma.team.findFirst as jest.Mock).mockResolvedValue({ maxGrade: 3 });
  expect((await POST(request([{ ...family, grade: 4 }]), ctx)).status).toBe(400);
  expect(prisma.member.create).not.toHaveBeenCalled();
});
test("既存ペアの表記ゆれを検出して全件を409で拒否する", async () => {
  (prisma.member.findMany as jest.Mock).mockResolvedValue([{ guardians: [{ name: "Ａ　Ｂ" }], children: [{ name: "Ｃ" }] }]);
  expect((await POST(request([family, { guardianName: "A B", childName: "C", grade: null }]), ctx)).status).toBe(409);
  expect(prisma.member.create).not.toHaveBeenCalled();
  expect(prisma.team.update).not.toHaveBeenCalled();
  expect(trackServerEvent).not.toHaveBeenCalled();
});
test("異なる家族に存在する名前同士では誤って重複扱いしない", async () => {
  (prisma.member.findMany as jest.Mock).mockResolvedValue([
    { guardians: [{ name: "保護者" }], children: [{ name: "別の子" }] },
    { guardians: [{ name: "別の親" }], children: [{ name: "子ども" }] },
  ]);
  expect((await POST(request(), ctx)).status).toBe(201);
});
test("途中の作成失敗はtransaction全体の例外として伝播し成功計測しない", async () => {
  (prisma.member.create as jest.Mock).mockResolvedValueOnce({ id: 1 }).mockRejectedValueOnce(new Error("private input"));
  let transactionRejected = false;
  (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
    try { return await callback(prisma); } catch (error) { transactionRejected = true; throw error; }
  });
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect((await POST(request([family, { ...family, childName: "次の子" }]), ctx)).status).toBe(500);
    expect(transactionRejected).toBe(true);
    expect(prisma.team.update).not.toHaveBeenCalled();
    expect(trackServerEvent).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("家族の一括登録に失敗しました");
  } finally { log.mockRestore(); }
});
test("並行更新の競合は409で再確認を促す", async () => {
  (prisma.$transaction as jest.Mock).mockRejectedValue({ code: "P2034" });
  expect((await POST(request(), ctx)).status).toBe(409);
  expect(trackServerEvent).not.toHaveBeenCalled();
});
