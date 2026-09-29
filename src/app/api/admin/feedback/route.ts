import { prisma } from "@/lib/prisma";
import { isFeedbackOperator } from "@/lib/feedbackOperator";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export const GET = async (request: NextRequest) => {
  if (!(await isFeedbackOperator(request))) {
    return NextResponse.json({ message: "権限がありません" }, { status: 403 });
  }

  const beforeText = request.nextUrl.searchParams.get("before");
  const before = beforeText === null ? null : Number(beforeText);
  if (beforeText !== null && (!Number.isSafeInteger(before) || before === null || before < 1)) {
    return NextResponse.json({ message: "ページ指定が不正です" }, { status: 400 });
  }

  const rows = await prisma.feedback.findMany({
    where: before === null ? undefined : { id: { lt: before } },
    orderBy: { id: "desc" },
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      category: true,
      message: true,
      replyEmail: true,
      createdAt: true,
      notificationStatus: true,
      notificationErrorCode: true,
      notificationResponseCode: true,
      notificationAcceptedAt: true,
      reviewedAt: true,
    },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE);

  return NextResponse.json({
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  }, { headers: { "Cache-Control": "private, no-store" } });
};
