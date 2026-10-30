/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { verifyMemberPin } from "@/utils/pinCache";

jest.mock("@/lib/prisma", () => ({
  prisma: { ride: { findFirst: jest.fn() }, $transaction: jest.fn() },
}));
jest.mock("@/utils/pinCache", () => ({ verifyMemberPin: jest.fn() }));

const context = { params: { teamId: "2", rideId: "9" } };

test("回答保存時は割り当て変更より先に配車の更新時刻を進める", async () => {
  const calls: string[] = [];
  (verifyMemberPin as jest.Mock).mockResolvedValue(true);
  (prisma.ride.findFirst as jest.Mock).mockResolvedValue({ deadline: null, lockAfterDeadline: false });
  const tx = {
    ride: { update: jest.fn().mockImplementation(async () => { calls.push("ride"); }) },
    availabilityDriver: {
      upsert: jest.fn().mockImplementation(async () => {
        calls.push("answer");
        return { id: 11, availability: true, seats: 4, comment: null, guardianId: 3, rideId: 9 };
      }),
    },
    driver: { deleteMany: jest.fn() },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
  const request = new NextRequest("https://app.example/api/member/teams/2/rides/9/availability", {
    method: "POST",
    headers: { "x-pin": "1234" },
    body: JSON.stringify({
      guardianId: 3,
      driverAvailability: true,
      driverDirection: "both",
      seats: 4,
      escortAvailability: true,
      escortDirection: "both",
      childAvailabilities: [],
    }),
  });

  const response = await POST(request, context);

  expect(response.status).toBe(200);
  expect(calls).toEqual(["ride", "answer", "answer"]);
  expect(tx.ride.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 9, teamId: 2 },
    data: { updatedAt: expect.any(Date) },
  }));
});
