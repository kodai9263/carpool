import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthTeam } from "@/utils/withAuth";
import {
  buildSettlementDetail,
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
      const body = await request.json().catch(() => null) as { version?: unknown } | null;
      if (!body) throw new SettlementInputError("訂正内容を確認してください");
      const version = parseSettlementVersion(body.version);
      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.rideSettlement.findFirst({
          where: { id: settlementId, teamId },
          include: settlementDetailInclude,
        });
        if (!current) return { kind: "notFound" as const };
        if (current.version !== version) return { kind: "conflict" as const };
        if (["voiding", "voided"].includes(current.status)) throw new SettlementInputError("取消中または取消済みの精算は訂正できません");
        if (current.draft !== null) return { kind: "ok" as const, settlement: current };
        const detail = buildSettlementDetail(current);
        if (!detail.currentRevision) throw new SettlementInputError("訂正する確定版がありません");
        const snapshot = detail.currentRevision.snapshot;
        const draft = {
          allocationMethod: snapshot.allocationMethod,
          expenses: snapshot.expenses,
          families: snapshot.families,
          sourceFingerprint: snapshot.sourceFingerprint,
        };
        const changed = await tx.rideSettlement.updateMany({
          where: { id: settlementId, teamId, version },
          data: { draft: draft as unknown as Prisma.InputJsonValue, version: { increment: 1 } },
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
      console.error("遠征費精算の訂正開始に失敗しました", error);
      return NextResponse.json({ message: "訂正を開始できませんでした" }, { status: 500 });
    }
  }, { params: { teamId: ctx.params.teamId } });
