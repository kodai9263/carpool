import { prisma } from "@/lib/prisma";
import { isFeedbackOperator } from "@/lib/feedbackOperator";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  if (!(await isFeedbackOperator(request))) {
    return NextResponse.json({ canAccess: false, unreadCount: 0 }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const unreadCount = await prisma.feedback.count({ where: { reviewedAt: null } });
  return NextResponse.json({ canAccess: true, unreadCount }, {
    headers: { "Cache-Control": "private, no-store" },
  });
};
