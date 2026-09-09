import type { GettingStartedResponse } from "@/app/_types/response/gettingStartedResponse";
import { prisma } from "@/lib/prisma";
import { isProPlan } from "@/utils/billing";
import { isAnswerLocked } from "@/utils/deadlineLock";
import { withAuthTeam } from "@/utils/withAuth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = (request: NextRequest, ctx: { params: { teamId: string } }) =>
  withAuthTeam(request, async ({ adminId, teamId }) => {
    try {
      // 実行サーバーのタイムゾーンに依存せず、日本時間の今日の午前0時を求める。
      const jstOffset = 9 * 60 * 60 * 1000;
      const dayLength = 24 * 60 * 60 * 1000;
      const today = new Date(Math.floor((Date.now() + jstOffset) / dayLength) * dayLength - jstOffset);
      const [memberCount, childCount, ride, admin] = await Promise.all([
        prisma.member.count({ where: { teamId } }),
        prisma.child.count({ where: { member: { teamId } } }),
        prisma.ride.findFirst({
          where: { teamId, date: { gte: today } },
          orderBy: [{ date: "asc" }, { id: "asc" }],
          select: {
            id: true,
            date: true,
            destination: true,
            deadline: true,
            lockAfterDeadline: true,
            _count: {
              select: {
                // 自動割り当てAPIと同じ条件で運転候補の回答を数える。
                availabilityDrivers: { where: { teamId, type: "driver", availability: true } },
              },
            },
          },
        }),
        prisma.admin.findUniqueOrThrow({
          where: { id: adminId },
          select: { autoAssignTrialUsed: true, billingPlan: true },
        }),
      ]);
      return NextResponse.json({
        memberCount,
        childCount,
        ride: ride ? {
          id: ride.id,
          date: ride.date.toISOString(),
          destination: ride.destination,
          driverCount: ride._count.availabilityDrivers,
          isAnswerLocked: isAnswerLocked(ride.deadline, ride.lockAfterDeadline),
        } : null,
        hasTriedAutoAssign: admin.autoAssignTrialUsed > 0 || isProPlan(admin.billingPlan),
      } satisfies GettingStartedResponse);
    } catch (error) {
      console.error("初回利用状況の取得に失敗しました:", error);
      return NextResponse.json({ message: "初回利用状況を取得できませんでした" }, { status: 500 });
    }
  }, ctx);
