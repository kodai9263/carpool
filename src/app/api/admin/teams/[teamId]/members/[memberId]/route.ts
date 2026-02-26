import { MemberFormValues } from "@/app/_types/member"; 
import { MemberDetailResponse, UpdateMemberResponse } from "@/app/_types/response/memberResponse";
import { getCurrentSchoolYear } from "@/utils/gradeUtils";
import { withAdminTeamMember } from "@/utils/withAuth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

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
      const rawGuardians = Array.isArray(body.guardians) ? body.guardians : [];
      const validGuardians = rawGuardians
        .filter((guardians) => guardians && typeof guardians.name === 'string' && guardians.name.trim().length > 0)
        .map((guardians) => ({ name: guardians.name.trim() }));
        if (validGuardians.length === 0) {
          return NextResponse.json({ message: "保護者名を入力してください" }, { status: 400 });
        } 

      const cleaned = body.children
        .filter((child) => child.name.trim().length > 0)
        .map((child) => ({ name: child.name.trim(), grade: child.grade ?? null }));

        const seen = new Set<string>();
        const children = cleaned.filter((child) => {
          if (seen.has(child.name)) return false;
          seen.add(child.name);
          return true;
        })

      try {
        const member = await prisma.$transaction(async (tx) => {
          // メンバー名の更新
          const updateMember = await tx.member.findFirst({
            where: { id: memberId },
            select: { id: true },
          });

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
            // 更新前の子供の数
            const beforeCount = await tx.child.count({ where: { memberId } });

            // 既存の子供を削除
            await tx.child.deleteMany({ where: { memberId } });

            // 新しい子供作成(あれば)
            if (children.length > 0) {
              const currentSchoolYear = getCurrentSchoolYear();
              await tx.child.createMany({
                data: children.map((child) => ({
                  name: child.name,
                  grade: child.grade,
                  gradeYear: currentSchoolYear,
                  memberId,
                })),
              });
            }

            // チームのメンバーカウント差分調整
            const delta = children.length - beforeCount;
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
            id: updateMember!.id,
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
          await prisma.member.deleteMany({
            where: {id: memberId, teamId },
          });
          return NextResponse.json({ status: "OK", message: "削除しました" }, { status: 200 });
        } catch (e) {
          if (e && typeof e === 'object' && 'code' in e && e.code === "P2025") {
            return NextResponse.json({ message: "not found" }, { status: 400 });
          }
          return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
        }
      }, ctx);