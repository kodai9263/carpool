/** @jest-environment node */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdminId } from "@/utils/auth";
import { isFeedbackOperator } from "../feedbackOperator";

jest.mock("@/lib/prisma", () => ({
  prisma: { admin: { findUnique: jest.fn() } },
}));
jest.mock("@/utils/auth", () => ({ getAuthAdminId: jest.fn() }));

const request = new NextRequest("https://app.example/api/admin/feedback");
const originalEmail = process.env.CARPOOL_FEEDBACK_OPERATOR_EMAIL;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CARPOOL_FEEDBACK_OPERATOR_EMAIL = "operator@example.com";
  (getAuthAdminId as jest.Mock).mockResolvedValue(7);
  (prisma.admin.findUnique as jest.Mock).mockResolvedValue({ email: "operator@example.com" });
});

afterAll(() => {
  if (originalEmail === undefined) delete process.env.CARPOOL_FEEDBACK_OPERATOR_EMAIL;
  else process.env.CARPOOL_FEEDBACK_OPERATOR_EMAIL = originalEmail;
});

test("一致する運営管理者だけを許可する", async () => {
  expect(await isFeedbackOperator(request)).toBe(true);
  expect(prisma.admin.findUnique).toHaveBeenCalledWith({
    where: { id: 7 },
    select: { email: true },
  });
});

test("通常の管理者と未認証を拒否する", async () => {
  (prisma.admin.findUnique as jest.Mock).mockResolvedValueOnce({ email: "customer@example.com" });
  expect(await isFeedbackOperator(request)).toBe(false);

  (getAuthAdminId as jest.Mock).mockResolvedValueOnce(null);
  expect(await isFeedbackOperator(request)).toBe(false);
});

test("運営メール未設定なら誰にも権限を与えない", async () => {
  delete process.env.CARPOOL_FEEDBACK_OPERATOR_EMAIL;
  expect(await isFeedbackOperator(request)).toBe(false);
  expect(getAuthAdminId).not.toHaveBeenCalled();
});
