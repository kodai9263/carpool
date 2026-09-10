import { prisma } from "@/lib/prisma";
import { bulkFamilyKey, validateBulkFamilies } from "@/utils/bulkMembers";
import { getCurrentSchoolYear } from "@/utils/gradeUtils";
import { trackServerEvent } from "@/utils/serverAnalytics";
import { withAuthTeam } from "@/utils/withAuth";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

class BulkRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const POST = (request: NextRequest, ctx: { params: { teamId: string } }) =>
  withAuthTeam(request, async ({ adminId, teamId }) => {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !("families" in body)) {
      return NextResponse.json({ message: "家族の入力を確認してください" }, { status: 400 });
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        const team = await tx.team.findFirst({ where: { id: teamId, adminId }, select: { maxGrade: true } });
        if (!team) throw new BulkRequestError("チームが見つかりません", 404);
        let families;
        try {
          families = validateBulkFamilies(body.families, team.maxGrade);
        } catch (error) {
          throw new BulkRequestError(error instanceof Error ? error.message : "入力を確認してください", 400);
        }
        // 表記ゆれも比較するため、同じ家族に属する保護者・子どもの名前だけを取得する。
        const existing = await tx.member.findMany({
          where: { teamId },
          select: { guardians: { select: { name: true } }, children: { select: { name: true } } },
        });
        const pairs = new Set(existing.flatMap((member) => member.guardians.flatMap((guardian) =>
          member.children.map((child) => bulkFamilyKey(guardian.name, child.name)))));
        if (families.some((family) => pairs.has(bulkFamilyKey(family.guardianName, family.childName)))) {
          throw new BulkRequestError("登録済みの保護者名と子ども名の組み合わせがあります。同姓同名の場合は個別登録をご利用ください。", 409);
        }
        const gradeYear = getCurrentSchoolYear();
        for (const family of families) {
          await tx.member.create({
            data: {
              teamId,
              guardians: { create: { name: family.guardianName } },
              children: { create: { name: family.childName, grade: family.grade, gradeYear } },
            },
            select: { id: true },
          });
        }
        await tx.team.update({ where: { id: teamId }, data: { memberCount: { increment: families.length } } });
        return { families: families.length, children: families.length };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
      await trackServerEvent("member_bulk_created", { family_count: result.families, child_count: result.children }, { adminId, request });
      return NextResponse.json({ status: "OK", ...result }, { status: 201 });
    } catch (error) {
      if (error instanceof BulkRequestError) return NextResponse.json({ message: error.message }, { status: error.status });
      if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
        return NextResponse.json({ message: "同時に登録内容が更新されました。一覧を確認してから再度お試しください。" }, { status: 409 });
      }
      // DBエラーに入力された個人名が含まれる可能性があるため詳細は出力しない。
      console.error("家族の一括登録に失敗しました");
      return NextResponse.json({ message: "家族を登録できませんでした" }, { status: 500 });
    }
  }, ctx);
