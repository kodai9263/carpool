/** @jest-environment node */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isFeedbackOperator } from "@/lib/feedbackOperator";
import { PATCH } from "../route";

jest.mock("@/lib/prisma", () => ({
  prisma: { feedback: { updateMany: jest.fn() } },
}));
jest.mock("@/lib/feedbackOperator", () => ({ isFeedbackOperator: jest.fn() }));

const request = new NextRequest("https://app.example/api/admin/feedback/20", { method: "PATCH" });

beforeEach(() => {
  jest.clearAllMocks();
  (isFeedbackOperator as jest.Mock).mockResolvedValue(true);
  (prisma.feedback.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
});

test("運営者以外は確認状態を変更できない", async () => {
  (isFeedbackOperator as jest.Mock).mockResolvedValueOnce(false);
  expect((await PATCH(request, { params: { feedbackId: "20" } })).status).toBe(403);
  expect(prisma.feedback.updateMany).not.toHaveBeenCalled();
});

test("運営者は投稿を確認済みにできる", async () => {
  const response = await PATCH(request, { params: { feedbackId: "20" } });
  expect(response.status).toBe(200);
  expect(prisma.feedback.updateMany).toHaveBeenCalledWith({
    where: { id: 20 },
    data: { reviewedAt: expect.any(Date) },
  });
});
