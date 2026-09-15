import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthTeam } from "@/utils/withAuth";

export const runtime = "nodejs";

export const GET = (request: NextRequest, ctx: { params: { teamId: string } }) =>
  withAuthTeam(request, async ({ teamId }) => {
    const settlements = await prisma.rideSettlement.findMany({
      where: { teamId },
      select: {
        id: true,
        rideId: true,
        sourceDate: true,
        sourceDestination: true,
        status: true,
        version: true,
        currentRevisionNumber: true,
        revisions: {
          orderBy: { revision: "desc" },
          take: 1,
          select: { totalAmount: true },
        },
      },
      orderBy: [{ sourceDate: "desc" }, { id: "desc" }],
      take: 100,
    });
    return NextResponse.json({
      status: "OK",
      settlements: settlements.map(({ revisions, ...settlement }) => ({
        ...settlement,
        sourceDate: settlement.sourceDate.toISOString(),
        totalAmount: revisions[0]?.totalAmount ?? null,
      })),
    });
  }, ctx);
