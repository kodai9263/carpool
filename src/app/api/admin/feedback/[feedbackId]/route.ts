import { prisma } from "@/lib/prisma";
import { isFeedbackOperator } from "@/lib/feedbackOperator";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export const PATCH = async (
  request: NextRequest,
  { params }: { params: { feedbackId: string } },
) => {
  if (!(await isFeedbackOperator(request))) {
    return NextResponse.json({ message: "権限がありません" }, { status: 403 });
  }

  const feedbackId = Number(params.feedbackId);
  if (!Number.isSafeInteger(feedbackId) || feedbackId < 1) {
    return NextResponse.json({ message: "受付番号が不正です" }, { status: 400 });
  }

  const result = await prisma.feedback.updateMany({
    where: { id: feedbackId },
    data: { reviewedAt: new Date() },
  });
  if (result.count === 0) {
    return NextResponse.json({ message: "投稿が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ success: true }, {
    headers: { "Cache-Control": "private, no-store" },
  });
};
