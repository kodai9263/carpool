/** @jest-environment node */
import { NextRequest } from "next/server";
import { DELETE } from "../route";
import { prisma } from "@/lib/prisma";

jest.mock("@/utils/withAuth", () => ({
  withAuthEntry: jest.fn(async (
    _request: NextRequest,
    handler: (context: { adminId: number; teamId: number }) => Promise<Response>,
  ) => handler({ adminId: 7, teamId: 2 })),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    rideSettlement: { count: jest.fn() },
    team: { deleteMany: jest.fn() },
  },
}));

const request = new NextRequest("https://app.example/api/admin/teams/2", { method: "DELETE" });
const context = { params: { teamId: "2" } };

beforeEach(() => jest.clearAllMocks());

test("精算履歴があるチームの削除を止める", async () => {
  (prisma.rideSettlement.count as jest.Mock).mockResolvedValue(1);

  const response = await DELETE(request, context);

  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ message: "遠征費精算の履歴があるチームは削除できません" });
  expect(prisma.team.deleteMany).not.toHaveBeenCalled();
});

test("精算履歴がなければ従来どおりチームを削除する", async () => {
  (prisma.rideSettlement.count as jest.Mock).mockResolvedValue(0);
  (prisma.team.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

  const response = await DELETE(request, context);

  expect(response.status).toBe(200);
  expect(prisma.team.deleteMany).toHaveBeenCalledWith({ where: { id: 2, adminId: 7 } });
});
