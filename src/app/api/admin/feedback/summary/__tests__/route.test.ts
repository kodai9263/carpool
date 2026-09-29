/** @jest-environment node */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isFeedbackOperator } from "@/lib/feedbackOperator";
import { GET } from "../route";

jest.mock("@/lib/prisma", () => ({
  prisma: { feedback: { count: jest.fn() } },
}));
jest.mock("@/lib/feedbackOperator", () => ({ isFeedbackOperator: jest.fn() }));

const request = new NextRequest("https://app.example/api/admin/feedback/summary");

beforeEach(() => {
  jest.clearAllMocks();
  (isFeedbackOperator as jest.Mock).mockResolvedValue(true);
  (prisma.feedback.count as jest.Mock).mockResolvedValue(2);
});

test("運営者以外へ件数を公開しない", async () => {
  (isFeedbackOperator as jest.Mock).mockResolvedValueOnce(false);
  const response = await GET(request);
  expect(await response.json()).toEqual({ canAccess: false, unreadCount: 0 });
  expect(prisma.feedback.count).not.toHaveBeenCalled();
});

test("運営者には未確認件数を返す", async () => {
  const response = await GET(request);
  expect(await response.json()).toEqual({ canAccess: true, unreadCount: 2 });
  expect(prisma.feedback.count).toHaveBeenCalledWith({ where: { reviewedAt: null } });
});
