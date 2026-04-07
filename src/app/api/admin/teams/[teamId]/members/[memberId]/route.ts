import { MemberFormValues } from "@/app/_types/member"; 
import { MemberDetailResponse, UpdateMemberResponse } from "@/app/_types/response/memberResponse";
import { getCurrentSchoolYear } from "@/utils/gradeUtils";
import { withAdminTeamMember } from "@/utils/withAuth";
import { prisma } from "@/lib/prisma";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// メンバー詳細取得(自分のチームのみ)
export const GET = (request: NextRequest, ctx: { params: { teamId: string; memberId: string } }) =>
  withAdminTeamMember(request, async({ teamId, memberId }) => {
    try {
      const member = await prisma.member.findFirst({
        where: { id: memberId, teamId },
        select: { 
          id: true,
          guardians: { select: { id: true, name: true} },
          children: {
            select: { id: true, name: true, grade: true, gradeYear: true },
          }
        },
      });
      if (!member) return NextResponse.json({ message: "not found" }, { status: 404 });
      return NextResponse.json({ status: "OK", member } satisfies MemberDetailResponse, { status: 200 });
    } catch {
      return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  }, ctx);

  // メンバー更新(自分のチームのみ)
  export const PUT = (request: NextRequest, ctx: { params: { teamId: string; memberId: string } }) =>
    withAdminTeamMember(request, async({ teamId, memberId }) => {
      const body = await request.json().catch(() => null) as MemberFormValues | null;
      if (!body) {
        return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 });
      }
      // 不正な入力を弾いてから createMany 用の形にする
      const rawGuardians = Array.isArray(body.guardians) ? body.guardians : [];
      const validGuardians = rawGuardians
        .filter((guardians) => guardians && typeof guardians.name === 'string' && guardians.name.trim().length > 0)
        .map((guardians) => ({ name: guardians.name.trim() }));
        if (validGuardians.length === 0) {
          return NextResponse.json({ message: "保護者名を入力してください" }, { status: 400 });
        } 

      // 子供のからの行を除き、名前の重複は先頭のみ採用
      const cleaned = body.children
        .filter((child) => child.name.trim().length > 0)
        .map((child) => ({
          name: child.name.trim(),
          // valueAsNumber で空欄がNaNになるケースを考慮してnullに変換
          grade: Number.isFinite(child.grade) ? (child.grade as number) : null,
        }));

        const seen = new Set<string>();
        const children = cleaned.filter((child) => {
          if (seen.has(child.name)) return false;
          seen.add(child.name);
          return true;
        })

      try {
        const member = await prisma.$transaction(async (tx) => {
          // 保護者を全削除して再作成
          await tx.guardian.deleteMany({ where: { memberId } });
          await tx.guardian.createMany({
            data: validGuardians.map((guardian) => ({
              name: guardian.name,
              memberId,
            })),
          });

          const updateGuardians = await tx.guardian.findMany({
            where: { memberId },
            select: { id: true, name: true },
          });

          // 子供の更新処理
          let childNames: string[];

          if(children) {
            // DBの現在の子供を取得して差分を計算
            const existingChildren = await tx.child.findMany({
              where: { memberId },
              select: { id: true, name: true },
            });

            const existingByName = new Map(existingChildren.map((c) => [c.name, c]));
            const incomingNames = new Set(children.map((c) => c.name));

            // 削除対象: DBにあるがフォームにない子供
            const toDeleteIds = existingChildren
              .filter((c) => !incomingNames.has(c.name))
              .map((c) => c.id);

            // 追加対象: フォームにあるがDBにない子供
            const toCreate = children.filter((c) => !existingByName.has(c.name));

            let deletedCount = 0;
            if (toDeleteIds.length > 0) {
              const { count } = await tx.child.deleteMany({
                where: { id: { in: toDeleteIds } },
              });
              deletedCount = count;
            }

            const currentSchoolYear = getCurrentSchoolYear();

            if (toCreate.length > 0) {
              await tx.child.createMany({
                data: toCreate.map((child) => ({
                  name: child.name,
                  grade: child.grade,
                  gradeYear: child.grade !== null ? currentSchoolYear : null,
                  memberId,
                })),
              });
            }

            // 既存の子供（名前が同じ）の学年を更新
            const toUpdate = children.filter((c) => existingByName.has(c.name));
            for (const child of toUpdate) {
              await tx.child.updateMany({
                where: { memberId, name: child.name },
                data: {
                  grade: child.grade,
                  gradeYear: child.grade !== null ? currentSchoolYear : null,
                },
              });
            }

            // チームのメンバーカウント差分調整
            const delta = toCreate.length - deletedCount;
            if (delta !== 0) {
              await tx.team.update({
                where: { id: teamId },
                data: { memberCount: { increment: delta } },
              });
            }
            childNames = children.map((child) => child.name);
          } else {
            // childrenがnullの場合は現在の子供の情報を返す
            const currentChildren = await tx.child.findMany({
              where: { memberId },
              select: { name: true },
              orderBy: { name: "asc" },
            });
            childNames = currentChildren.map(c => c.name);
          }
          return {
            id: memberId,
            guardians: updateGuardians,
            children: childNames
          };
        });

        return NextResponse.json(
          { status: "OK", message: "更新しました", member } satisfies UpdateMemberResponse,
          { status: 200 }
        );
      } catch {
        return NextResponse.json({ message: "サーバ内部でエラーが発生しました" }, { status: 500 });
      }
    }, ctx);

    // メンバー削除
    export const DELETE = (request: NextRequest, ctx: { params: { teamId: string; memberId: string } }) =>
      withAdminTeamMember(request, async({ teamId, memberId }) =>{
        try {
          await prisma.$transaction(async (tx) => {
            // 子供を先に削除してカウントを取得（cascadeより先に実行）
            const { count: childCount } = await tx.child.deleteMany({ where: { memberId } });
            await tx.member.deleteMany({ where: {id: memberId, teamId }})
            // 削除した子供の数だけmemberCountを減算
            if (childCount > 0) {
              await tx.team.update({
                where: { id: teamId },
                data: { memberCount: { decrement: childCount } },
              });
            }
          });
          return NextResponse.json({ status: "OK", message: "削除しました" }, { status: 200 });
        } catch (e) {
          if (e && typeof e === 'object' && 'code' in e && e.code === "P2025") {
            return NextResponse.json({ message: "not found" }, { status: 400 });
          }
          return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
        }
      }, ctx);