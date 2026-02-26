import { MemberFormValues } from "@/app/_types/member"; 
import { CreateMemberResponse, MemberListResponse } from "@/app/_types/response/memberResponse";
import { getCurrentSchoolYear } from "@/utils/gradeUtils";
import { withAuthTeam } from "@/utils/withAuth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export const runtime = "nodejs";

// メンバー一覧取得
export const GET = (request: NextRequest, ctx: { params: { teamId: string } }) => 
  withAuthTeam(request, async({ teamId }) => {
    try {
      const { searchParams } = new URL(request.url);
      const p = Number(searchParams.get("page"));
      const pp = Number(searchParams.get("perPage"));
      const page = Number.isFinite(p) && p > 0 ? Math.floor(p) : 1;
      const perPage = Number.isFinite(pp) && pp > 0 ? Math.min(300, Math.floor(pp)) : 10;
      const skip = (page - 1) * perPage;

      const [total, members] = await Promise.all([
        prisma.member.count({ where: { teamId } }),
        prisma.member.findMany({
          where: { teamId },
          select: {
            id: true,
            guardians: { select: { id: true, name: true } },
          },
          orderBy: { id: 'asc' },
          skip,
          take: perPage,
        }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / perPage));

      return NextResponse.json(
        { status: "OK", members, page, perPage, total, totalPages } satisfies MemberListResponse,
        { status: 200 }
      );
    } catch (e: unknown) {
      if (e instanceof Error) {
        return NextResponse.json({ message: e.message }, { status: 400 });
      }
      return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  },
  ctx
);

  // メンバー作成
  export const POST = (request: NextRequest, ctx: { params: { teamId: string }}) =>
    withAuthTeam(request, async({ teamId }) => {
      try {
        const body = await request.json().catch(() => null) as MemberFormValues | null;
        if (!body) {
          return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 });
        }
        
        const rawGuardians = Array.isArray(body.guardians) ? body.guardians : [];
        const validGuardians = rawGuardians
          .filter((guardian) => guardian && typeof guardian.name === 'string' && guardian.name.trim().length > 0)
          .map((guardian) => ({ name: guardian.name.trim() }));
        if (validGuardians.length === 0) {
          return NextResponse.json({ message: "保護者名を入力してください"}, { status: 400 });
        }

        // 子供のデータが配列か確認
        let rawChildren: { name: string; grade?: number; }[] = [];
        if (Array.isArray(body.children)) {
          rawChildren = body.children;
        }

        // 子供のデータを整形
        const validChildren = rawChildren
          .filter((child) => child && typeof child.name === 'string' && child.name.trim().length > 0)
          .map((child) => ({
            name: child.name.trim(),
            grade: child.grade ?? null,
          }));

        // 重複を削除して配列に
        const seen = new Set<string>();
        const uniqueChildren = validChildren.filter((child) => {
          if (seen.has(child.name)) return false;
          seen.add(child.name);
          return true;
        });

        const result = await prisma.$transaction(async (tx) => {
          // 保護者作成
          const member = await tx.member.create({
            data: { teamId },
            select: { id : true },
          });

          await tx.guardian.createMany({
            data: validGuardians.map((guardian) => ({
              name: guardian.name,
              memberId: member.id,
            })),
          });

          // 子供をまとめて作成（0件ならスキップ）
          let createdChildren = 0;
          if (uniqueChildren.length > 0) {
            const currentSchoolYear = getCurrentSchoolYear();
            const res = await tx.child.createMany({
              data: uniqueChildren.map((child) => ({
                name: child.name,
                grade: child.grade,
                gradeYear: currentSchoolYear,
                memberId: member.id,
              })),
            });
            createdChildren = res.count;
          }

          // 子供の数だけメンバーの数をプラス
          const incrementMember = createdChildren;
          if (incrementMember > 0) {
            await tx.team.update({
              where: { id: teamId },
              data: { memberCount: { increment: incrementMember } },
            });
          }
          return { memberId: member.id, createdChildren };
        });

        return NextResponse.json(
          { status: "OK", message: "作成しました", memberId: result.memberId, children: result.createdChildren } satisfies CreateMemberResponse,
          { status: 201 }
        );
      } catch {
        return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
      }
    },
    ctx
  );