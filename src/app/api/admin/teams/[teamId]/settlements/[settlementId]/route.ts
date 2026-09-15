import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthTeam } from "@/utils/withAuth";
import {
  buildSettlementDetail,
  mergeSettlementDraft,
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

function settlementIdFrom(ctx: Context): number | null {
  const id = Number(ctx.params.settlementId);
  return Number.isInteger(id) ? id : null;
}

export const GET = (request: NextRequest, ctx: Context) =>
  withAuthTeam(request, async ({ teamId }) => {
    const settlementId = settlementIdFrom(ctx);
    if (settlementId === null) return NextResponse.json({ message: "精算IDが正しくありません" }, { status: 400 });
    const settlement = await prisma.rideSettlement.findFirst({
      where: { id: settlementId, teamId },
      include: settlementDetailInclude,
    });
    if (!settlement) return NextResponse.json({ message: "精算が見つかりません" }, { status: 404 });
    return NextResponse.json({ status: "OK", settlement: buildSettlementDetail(settlement) });
  }, { params: { teamId: ctx.params.teamId } });

export const PATCH = (request: NextRequest, ctx: Context) =>
  withAuthTeam(request, async ({ teamId }) => {
    const settlementId = settlementIdFrom(ctx);
    if (settlementId === null) return NextResponse.json({ message: "精算IDが正しくありません" }, { status: 400 });
    try {
      const body = await request.json().catch(() => null) as { version?: unknown; draft?: unknown } | null;
      if (!body) throw new SettlementInputError("精算内容を確認してください");
      const version = parseSettlementVersion(body.version);
      const updated = await prisma.$transaction(async (tx) => {
        const access = await lockTeamSettlementAccess(tx, teamId);
        const current = await tx.rideSettlement.findFirst({
          where: { id: settlementId, teamId },
          include: settlementDetailInclude,
        });
        if (!current) return { kind: "notFound" as const };
        if (current.version !== version) return { kind: "conflict" as const };
        await requireDraftAccess(tx, access, current);
        if (["voiding", "voided"].includes(current.status)) {
          throw new SettlementInputError("取消中または取消済みの精算は編集できません");
        }
        const base = parseStoredDraft(current.draft);
        if (!base) throw new SettlementInputError("保存済みの下書きを読み込めません");
        const draft = mergeSettlementDraft(base, body.draft);
        const changed = await tx.rideSettlement.updateMany({
          where: { id: settlementId, teamId, version },
          data: {
            draft: draft as unknown as Prisma.InputJsonValue,
            sourceFingerprint: draft.sourceFingerprint,
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
      if (updated.kind === "notFound") return NextResponse.json({ message: "精算が見つかりません" }, { status: 404 });
      if (updated.kind === "conflict") return NextResponse.json({ message: "別の画面で更新されています。再読み込みしてください" }, { status: 409 });
      return NextResponse.json({ status: "OK", settlement: buildSettlementDetail(updated.settlement) });
    } catch (error) {
      if (error instanceof SettlementAccessError) {
        return NextResponse.json(settlementAccessErrorBody(error), { status: 402 });
      }
      if (error instanceof SettlementInputError) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      console.error("遠征費精算の下書き保存に失敗しました", error);
      return NextResponse.json({ message: "遠征費精算を保存できませんでした" }, { status: 500 });
    }
  }, { params: { teamId: ctx.params.teamId } });
