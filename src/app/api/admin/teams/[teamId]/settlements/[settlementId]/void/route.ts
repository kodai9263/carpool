import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthTeam } from "@/utils/withAuth";
import {
  buildSettlementDetail,
  calculateSnapshotWithMovements,
  parseSettlementVersion,
  SettlementInputError,
  settlementDetailInclude,
} from "@/utils/settlementServer";

export const runtime = "nodejs";

type Context = { params: { teamId: string; settlementId: string } };

export const POST = (request: NextRequest, ctx: Context) =>
  withAuthTeam(request, async ({ teamId }) => {
    const settlementId = Number(ctx.params.settlementId);
    if (!Number.isInteger(settlementId)) return NextResponse.json({ message: "精算IDが正しくありません" }, { status: 400 });
    try {
      const body = await request.json().catch(() => null) as { version?: unknown; reason?: unknown } | null;
      if (!body) throw new SettlementInputError("取消内容を確認してください");
      const version = parseSettlementVersion(body.version);
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason || reason.length > 500) throw new SettlementInputError("取消理由を1〜500文字で入力してください");
      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.rideSettlement.findFirst({
          where: { id: settlementId, teamId },
          include: settlementDetailInclude,
        });
        if (!current) return { kind: "notFound" as const };
        if (current.version !== version) return { kind: "conflict" as const };
        if (current.status === "voided") throw new SettlementInputError("この精算は取消済みです");
        if (current.status === "voiding") return { kind: "ok" as const, settlement: current };
        const detail = buildSettlementDetail(current);
        if (!detail.currentRevision) throw new SettlementInputError("未確定の精算は取り消せません");
        const cancellation = calculateSnapshotWithMovements(detail.currentRevision.snapshot, current.movements, true);
        const changed = await tx.rideSettlement.updateMany({
          where: { id: settlementId, teamId, version },
          data: {
            draft: Prisma.DbNull,
            voidReason: reason,
            status: cancellation.isComplete ? "voided" : "voiding",
            version: { increment: 1 },
          },
        });
        if (changed.count !== 1) return { kind: "conflict" as const };
        const settlement = await tx.rideSettlement.findFirstOrThrow({
          where: { id: settlementId, teamId },
          include: settlementDetailInclude,
        });
        return { kind: "ok" as const, settlement };
      });
      if (result.kind === "notFound") return NextResponse.json({ message: "精算が見つかりません" }, { status: 404 });
      if (result.kind === "conflict") return NextResponse.json({ message: "別の画面で更新されています。再読み込みしてください" }, { status: 409 });
      return NextResponse.json({ status: "OK", settlement: buildSettlementDetail(result.settlement) });
    } catch (error) {
      if (error instanceof SettlementInputError) return NextResponse.json({ message: error.message }, { status: 400 });
      console.error("遠征費精算の取消開始に失敗しました", error);
      return NextResponse.json({ message: "精算を取り消せませんでした" }, { status: 500 });
    }
  }, { params: { teamId: ctx.params.teamId } });
