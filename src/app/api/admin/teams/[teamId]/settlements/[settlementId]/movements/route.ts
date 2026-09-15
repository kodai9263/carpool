import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthTeam } from "@/utils/withAuth";
import {
  buildSettlementDetail,
  parseOperationKey,
  parseSettlementVersion,
  SettlementInputError,
  settlementDetailInclude,
} from "@/utils/settlementServer";

export const runtime = "nodejs";

type Context = { params: { teamId: string; settlementId: string } };

function positiveId(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) throw new SettlementInputError(`${label}を確認してください`);
  return value as number;
}

export const POST = (request: NextRequest, ctx: Context) =>
  withAuthTeam(request, async ({ adminId, teamId }) => {
    const settlementId = Number(ctx.params.settlementId);
    if (!Number.isInteger(settlementId)) return NextResponse.json({ message: "精算IDが正しくありません" }, { status: 400 });
    try {
      const body = await request.json().catch(() => null) as Record<string, unknown> | null;
      if (!body) throw new SettlementInputError("入出金内容を確認してください");
      const version = parseSettlementVersion(body.version);
      const operationKey = parseOperationKey(body.operationKey);
      const memberId = positiveId(body.memberId, "家庭ID");
      const isReversal = body.reversesMovementId != null;
      let signedAmount: number;
      if (isReversal) {
        if (!Number.isSafeInteger(body.signedAmount) || body.signedAmount === 0) {
          throw new SettlementInputError("取消額は0以外の整数で入力してください");
        }
        signedAmount = body.signedAmount as number;
      } else {
        if ((body.type !== "receipt" && body.type !== "refund") ||
            !Number.isSafeInteger(body.amount) || (body.amount as number) <= 0) {
          throw new SettlementInputError("受領・返金額は1円以上の整数で入力してください");
        }
        signedAmount = body.type === "receipt" ? body.amount as number : -(body.amount as number);
      }
      const reversesMovementId = body.reversesMovementId == null
        ? null
        : positiveId(body.reversesMovementId, "取消対象の記録ID");
      const note = typeof body.note === "string" ? body.note.trim() : "";
      if (note.length > 200 || (reversesMovementId !== null && !note)) {
        throw new SettlementInputError(reversesMovementId === null ? "メモは200文字以内にしてください" : "記録を取り消す理由を入力してください");
      }

      const result = await prisma.$transaction(async (tx) => {
        const duplicate = await tx.settlementMovement.findUnique({ where: { operationKey } });
        if (duplicate) {
          if (duplicate.settlementId !== settlementId) throw new SettlementInputError("操作IDが別の精算で使われています");
          const settlement = await tx.rideSettlement.findFirst({ where: { id: settlementId, teamId }, include: settlementDetailInclude });
          return settlement ? { kind: "ok" as const, settlement } : { kind: "notFound" as const };
        }
        const current = await tx.rideSettlement.findFirst({ where: { id: settlementId, teamId }, include: settlementDetailInclude });
        if (!current) return { kind: "notFound" as const };
        if (current.version !== version) return { kind: "conflict" as const };
        if (current.status === "draft") throw new SettlementInputError("先に精算金額を確定してください");
        if (current.status === "voided") throw new SettlementInputError("取消済みの精算には記録を追加できません");
        const detail = buildSettlementDetail(current);
        if (!detail.currentRevision || !detail.calculation) throw new SettlementInputError("先に精算金額を確定してください");
        const family = detail.currentRevision.snapshot.families.find((item) => item.memberId === memberId);
        const remaining = detail.calculation.families.find((item) => item.memberId === memberId)?.remainingAmount;
        if (!family || remaining === undefined) throw new SettlementInputError("対象家庭を確認してください");

        if (reversesMovementId !== null) {
          const original = current.movements.find((item) => item.id === reversesMovementId);
          if (!original || original.reversesMovementId !== null || current.movements.some((item) => item.reversesMovementId === original.id)) {
            throw new SettlementInputError("取消対象の記録を確認してください");
          }
          if (original.memberIdSnapshot !== memberId || signedAmount !== -original.signedAmount) {
            throw new SettlementInputError("取消額は元の記録と一致させてください");
          }
        } else {
          if (remaining === 0 || Math.sign(signedAmount) !== Math.sign(remaining) || Math.abs(signedAmount) > Math.abs(remaining)) {
            throw new SettlementInputError("受領・返金額が現在の残額を超えています");
          }
        }

        const prospectiveRemaining = remaining - signedAmount;
        const allComplete = detail.calculation.families.every((item) =>
          item.memberId === memberId ? prospectiveRemaining === 0 : item.remainingAmount === 0
        );
        const changed = await tx.rideSettlement.updateMany({
          where: { id: settlementId, teamId, version },
          data: {
            version: { increment: 1 },
            status: current.status === "voiding"
              ? allComplete ? "voided" : "voiding"
              : allComplete ? "completed" : "pending",
          },
        });
        if (changed.count !== 1) return { kind: "conflict" as const };
        await tx.settlementMovement.create({
          data: {
            settlementId,
            memberIdSnapshot: memberId,
            memberNameSnapshot: family.memberName,
            signedAmount,
            operationKey,
            note: note || null,
            reversesMovementId,
            createdByAdminId: adminId,
          },
        });
        const settlement = await tx.rideSettlement.findFirstOrThrow({ where: { id: settlementId, teamId }, include: settlementDetailInclude });
        return { kind: "ok" as const, settlement };
      });

      if (result.kind === "notFound") return NextResponse.json({ message: "精算が見つかりません" }, { status: 404 });
      if (result.kind === "conflict") return NextResponse.json({ message: "別の画面で更新されています。再読み込みしてください" }, { status: 409 });
      return NextResponse.json({ status: "OK", settlement: buildSettlementDetail(result.settlement) });
    } catch (error) {
      if (error instanceof SettlementInputError) return NextResponse.json({ message: error.message }, { status: 400 });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ message: "同じ入出金がすでに記録されています" }, { status: 409 });
      }
      console.error("遠征費精算の入出金記録に失敗しました", error);
      return NextResponse.json({ message: "受領・返金を記録できませんでした" }, { status: 500 });
    }
  }, { params: { teamId: ctx.params.teamId } });
