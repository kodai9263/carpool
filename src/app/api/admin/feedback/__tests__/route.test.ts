/** @jest-environment node */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isFeedbackOperator } from "@/lib/feedbackOperator";
import { GET } from "../route";

jest.mock("@/lib/prisma", () => ({
  prisma: { feedback: { findMany: jest.fn() } },
}));
jest.mock("@/lib/feedbackOperator", () => ({ isFeedbackOperator: jest.fn() }));

const request = (before?: string) =>
  new NextRequest(`https://app.example/api/admin/feedback${before ? `?before=${before}` : ""}`);

beforeEach(() => {
  jest.clearAllMocks();
  (isFeedbackOperator as jest.Mock).mockResolvedValue(true);
  (prisma.feedback.findMany as jest.Mock).mockResolvedValue([]);
});

test("運営者以外に投稿本文を返さない", async () => {
  (isFeedbackOperator as jest.Mock).mockResolvedValueOnce(false);
  const response = await GET(request());
  expect(response.status).toBe(403);
  expect(prisma.feedback.findMany).not.toHaveBeenCalled();
});

test("運営者には新しい投稿から30件だけ返す", async () => {
  (prisma.feedback.findMany as jest.Mock).mockResolvedValueOnce(
    Array.from({ length: 31 }, (_, index) => ({ id: 31 - index })),
  );
  const response = await GET(request());
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.items).toHaveLength(30);
  expect(body.nextCursor).toBe(2);
  expect(prisma.feedback.findMany).toHaveBeenCalledWith(expect.objectContaining({
    orderBy: { id: "desc" },
    take: 31,
  }));
});

test("不正なページ指定を拒否する", async () => {
  const response = await GET(request("NaN"));
  expect(response.status).toBe(400);
  expect(prisma.feedback.findMany).not.toHaveBeenCalled();
});
