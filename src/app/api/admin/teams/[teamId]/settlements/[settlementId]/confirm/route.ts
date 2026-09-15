import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthTeam } from "@/utils/withAuth";
import {
  buildSettlementDetail,
  calculateSnapshotWithMovements,
  createSettlementSnapshot,
  parseSettlementVersion,
  parseStoredDraft,
  SettlementInputError,
  settlementDetailInclude,
} from "@/utils/settlementServer";
import {
  consumeFreeTrial,
  lockTeamSettlementAccess,
  requireDraftAccess,
  SettlementAccessError,
  settlementAccessErrorBody,
} from "@/utils/settlementAccess";

export const runtime = "nodejs";

type Context = { params: { teamId: string; settlementId: string } };

export const POST = (request: NextRequest, ctx: Context) =>
  withAuthTeam(request, async ({ adminId, teamId }) => {
    const settlementId = Number(ctx.params.settlementId);
    if (!Number.isInteger(settlementId)) return NextResponse.json({ message: "精算IDが正しくありません" }, { status: 400 });
    try {
      const body = await request.json().catch(() => null) as { version?: unknown; correctionReason?: unknown; acceptSourceChanges?: unknown } | null;
      if (!body) throw new SettlementInputError("確認内容を取得できませんでした");
      const version = parseSettlementVersion(body.version);
      const correctionReason = typeof body.correctionReason === "string" ? body.correctionReason.trim() : "";
      if (correctionReason.length > 500) throw new SettlementInputError("訂正理由は500文字以内にしてください");

      const result = await prisma.$transaction(async (tx) => {
        const access = await lockTeamSettlementAccess(tx, teamId);
        const current = await tx.rideSettlement.findFirst({
          where: { id: settlementId, teamId },
          include: settlementDetailInclude,
        });
        if (!current) return { kind: "notFound" as const };
        if (current.version !== version) return { kind: "conflict" as const };
        const editableAccess = await requireDraftAccess(tx, access, current);
        const isInitialConfirmation = current.currentRevisionNumber === null;
        if (current.draft === null) throw new SettlementInputError("確定する下書きがありません");
        if (["voiding", "voided"].includes(current.status)) throw new SettlementInputError("取消中または取消済みの精算は確定できません");
        if (current.currentRevisionNumber !== null && !correctionReason) {
          throw new SettlementInputError("訂正理由を入力してください");
        }
        const sourceChanged = Boolean(
          current.ride && current.sourceRideUpdatedAt &&
          current.ride.updatedAt.getTime() !== current.sourceRideUpdatedAt.getTime()
        );
        if (sourceChanged && body.acceptSourceChanges !== true) {
          throw new SettlementInputError("配車内容が更新されています。対象を再取り込みするか、現在の精算対象を使うことを確認してください");
        }
        const draft = parseStoredDraft(current.draft);
        if (!draft) throw new SettlementInputError("保存済みの下書きを読み込めません");
        const snapshot = createSettlementSnapshot(draft, {
          rideId: current.rideId,
          date: current.sourceDate.toISOString(),
          destination: current.sourceDestination,
        });
        const currentCalculation = calculateSnapshotWithMovements(snapshot, current.movements);
        const revision = (current.currentRevisionNumber ?? 0) + 1;
        const changed = await tx.rideSettlement.updateMany({
          where: { id: settlementId, teamId, version },
          data: {
            currentRevisionNumber: revision,
            draft: Prisma.DbNull,
            status: currentCalculation.isComplete ? "completed" : "pending",
            version: { increment: 1 },
          },
        });
        if (changed.count !== 1) return { kind: "conflict" as const };
        await tx.settlementRevision.create({
          data: {
            settlementId,
            revision,
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            totalAmount: snapshot.calculation.totalCost,
            calculationVersion: "1",
            correctionReason: correctionReason || null,
            createdByAdminId: adminId,
          },
        });
        if (
          isInitialConfirmation &&
          editableAccess.freeTrialSettlementId === settlementId &&
          !editableAccess.freeTrialConsumedAt
        ) {
          await consumeFreeTrial(tx, editableAccess, settlementId);
        }
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
      if (error instanceof SettlementAccessError) {
        return NextResponse.json(settlementAccessErrorBody(error), { status: 402 });
      }
      if (error instanceof SettlementInputError) return NextResponse.json({ message: error.message }, { status: 400 });
      console.error("遠征費精算の確定に失敗しました", error);
      return NextResponse.json({ message: "遠征費精算を確定できませんでした" }, { status: 500 });
    }
  }, { params: { teamId: ctx.params.teamId } });
