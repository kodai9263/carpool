import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthTeam } from "@/utils/withAuth";
import {
  buildSettlementDetail,
  buildSettlementDraft,
  parseSettlementVersion,
  parseStoredDraft,
  SettlementInputError,
  settlementDetailInclude,
} from "@/utils/settlementServer";
import {
  lockTeamSettlementAccess,
  requireDraftAccess,
  SettlementAccessError,
  settlementAccessErrorBody,
} from "@/utils/settlementAccess";

export const runtime = "nodejs";

type Context = { params: { teamId: string; settlementId: string } };

export const POST = (request: NextRequest, ctx: Context) =>
  withAuthTeam(request, async ({ teamId }) => {
    const settlementId = Number(ctx.params.settlementId);
    if (!Number.isInteger(settlementId)) return NextResponse.json({ message: "精算IDが正しくありません" }, { status: 400 });
    try {
      const body = await request.json().catch(() => null) as { version?: unknown } | null;
      if (!body) throw new SettlementInputError("再取込内容を確認してください");
      const version = parseSettlementVersion(body.version);
      const result = await prisma.$transaction(async (tx) => {
        const access = await lockTeamSettlementAccess(tx, teamId);
        const current = await tx.rideSettlement.findFirst({ where: { id: settlementId, teamId }, include: settlementDetailInclude });
        if (!current) return { kind: "notFound" as const };
        if (current.version !== version) return { kind: "conflict" as const };
        await requireDraftAccess(tx, access, current);
        if (!current.rideId || !current.ride) throw new SettlementInputError("元の配車が削除されているため再取り込みできません");
        if (["voiding", "voided"].includes(current.status)) throw new SettlementInputError("取消中または取消済みの精算は再取り込みできません");
        const savedDraft = parseStoredDraft(current.draft);
        if (!savedDraft) throw new SettlementInputError("先に訂正用の下書きを作成してください");
        const ride = await tx.ride.findFirst({
          where: { id: current.rideId, teamId },
          select: {
            id: true,
            date: true,
            destination: true,
            updatedAt: true,
            rideAssignments: { select: { driver: { select: { direction: true } }, child: { select: { id: true, memberId: true } } } },
            childAvailabilities: { select: { childId: true, availability: true, selfDriving: true } },
          },
        });
        if (!ride) throw new SettlementInputError("元の配車が見つかりません");
        const members = await tx.member.findMany({
          where: { teamId },
          select: {
            id: true,
            guardians: { select: { name: true }, orderBy: { id: "asc" } },
            children: { select: { id: true, name: true }, orderBy: { id: "asc" } },
          },
          orderBy: { id: "asc" },
        });
        const refreshed = buildSettlementDraft(ride, members);
        const validMemberIds = new Set(refreshed.families.map((family) => family.memberId));
        const draft = {
          ...refreshed,
          allocationMethod: savedDraft.allocationMethod,
          expenses: savedDraft.expenses.map((expense) => ({
            ...expense,
            payerMemberId: expense.payerMemberId !== null && validMemberIds.has(expense.payerMemberId)
              ? expense.payerMemberId
              : null,
          })),
        };
        const changed = await tx.rideSettlement.updateMany({
          where: { id: settlementId, teamId, version },
          data: {
            sourceDate: ride.date,
            sourceDestination: ride.destination,
            sourceFingerprint: draft.sourceFingerprint,
            sourceRideUpdatedAt: ride.updatedAt,
            draft: draft as unknown as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
        });
        if (changed.count !== 1) return { kind: "conflict" as const };
        const settlement = await tx.rideSettlement.findFirstOrThrow({ where: { id: settlementId, teamId }, include: settlementDetailInclude });
        return { kind: "ok" as const, settlement };
      });
      if (result.kind === "notFound") return NextResponse.json({ message: "精算が見つかりません" }, { status: 404 });
      if (result.kind === "conflict") return NextResponse.json({ message: "別の画面で更新されています。再読み込みしてください" }, { status: 409 });
      return NextResponse.json({ status: "OK", settlement: buildSettlementDetail(result.settlement) });
    } catch (error) {
      if (error instanceof SettlementAccessError) {
        return NextResponse.json(settlementAccessErrorBody(error), { status: 402 });
      }
      if (error instanceof SettlementInputError) return NextResponse.json({ message: error.message }, { status: 400 });
      console.error("遠征費精算の再取り込みに失敗しました", error);
      return NextResponse.json({ message: "配車内容を再取り込みできませんでした" }, { status: 500 });
    }
  }, { params: { teamId: ctx.params.teamId } });
