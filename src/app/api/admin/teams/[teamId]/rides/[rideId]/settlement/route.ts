import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthTeam } from "@/utils/withAuth";
import {
  buildSettlementDetail,
  buildSettlementDraft,
  settlementDetailInclude,
} from "@/utils/settlementServer";
import {
  assignFreeTrialOrThrow,
  lockTeamSettlementAccess,
  SettlementAccessError,
  settlementAccessErrorBody,
} from "@/utils/settlementAccess";

export const runtime = "nodejs";

export const POST = (request: NextRequest, ctx: { params: { teamId: string; rideId: string } }) =>
  withAuthTeam(request, async ({ adminId, teamId }) => {
    const rideId = Number(ctx.params.rideId);
    if (!Number.isInteger(rideId)) {
      return NextResponse.json({ message: "配車IDが正しくありません" }, { status: 400 });
    }

    try {
      const body = await request.json().catch(() => null) as { moveFreeTrial?: unknown } | null;
      const moveFreeTrial = body?.moveFreeTrial === true;
      const result = await prisma.$transaction(async (tx) => {
        // 無料枠の行を最初にロックし、別遠征からの同時作成を直列化する。
        const access = await lockTeamSettlementAccess(tx, teamId);
        let existing = await tx.rideSettlement.findFirst({
          where: { rideId, teamId },
          include: settlementDetailInclude,
        });
        if (existing) {
          if (existing.currentRevisionNumber === null) {
            await assignFreeTrialOrThrow(tx, access, existing.id, moveFreeTrial);
            existing = await tx.rideSettlement.findFirstOrThrow({
              where: { id: existing.id, teamId },
              include: settlementDetailInclude,
            });
          }
          return { settlement: existing, created: false };
        }

        // withAuthTeamはTeamの所有権のみを確認するため、Rideの所属もここで確認する。
        const ride = await tx.ride.findFirst({
          where: { id: rideId, teamId },
          select: {
            id: true,
            date: true,
            destination: true,
            updatedAt: true,
            rideAssignments: {
              select: {
                driver: { select: { direction: true } },
                child: { select: { id: true, memberId: true } },
              },
            },
            childAvailabilities: {
              select: { childId: true, availability: true, selfDriving: true },
            },
          },
        });
        if (!ride) return null;

        const members = await tx.member.findMany({
          where: { teamId },
          select: {
            id: true,
            guardians: { select: { name: true }, orderBy: { id: "asc" } },
            children: { select: { id: true, name: true }, orderBy: { id: "asc" } },
          },
          orderBy: { id: "asc" },
        });
        if (members.length === 0) {
          throw new Error("SETTLEMENT_REQUIRES_FAMILY");
        }
        const draft = buildSettlementDraft(ride, members);
        const created = await tx.rideSettlement.create({
          data: {
            teamId,
            rideId,
            sourceDate: ride.date,
            sourceDestination: ride.destination,
            sourceFingerprint: draft.sourceFingerprint,
            sourceRideUpdatedAt: ride.updatedAt,
            draft: draft as unknown as Prisma.InputJsonValue,
            createdByAdminId: adminId,
          },
        });
        await assignFreeTrialOrThrow(tx, access, created.id, moveFreeTrial);
        const settlement = await tx.rideSettlement.findFirstOrThrow({
          where: { id: created.id, teamId },
          include: settlementDetailInclude,
        });
        return { settlement, created: true };
      });

      if (!result) return NextResponse.json({ message: "配車が見つかりません" }, { status: 404 });
      return NextResponse.json({
        status: "OK",
        settlement: buildSettlementDetail(result.settlement),
        created: result.created,
      }, { status: result.created ? 201 : 200 });
    } catch (error) {
      if (error instanceof SettlementAccessError) {
        return NextResponse.json(settlementAccessErrorBody(error), { status: 402 });
      }
      if (error instanceof Error && error.message === "SETTLEMENT_REQUIRES_FAMILY") {
        return NextResponse.json({ message: "先に家族を登録してください" }, { status: 400 });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // 無料枠の確認を通さず既存下書きを返さない。画面から安全に再試行してもらう。
        return NextResponse.json({ message: "別の画面で精算が作成されました。もう一度お試しください" }, { status: 409 });
      }
      console.error("遠征費精算の作成に失敗しました", error);
      return NextResponse.json({ message: "遠征費精算を開始できませんでした" }, { status: 500 });
    }
  }, { params: { teamId: ctx.params.teamId } });
