import { CreateMemberResponse, MemberListResponse, UpdateMemberResponse } from "@/app/_types/response/member";
import { withAuthTeam } from "@/utils/withAuth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export const runtime = "nodejs";

// メンバー一覧取得
export const GET = (request: NextRequest, ctx: { params: { teamId: string } }) => 
  withAuthTeam(request, async({ adminId, teamId }) => {
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
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
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
        return NextResponse.json({ status: e.message }, { status: 400 });
      }
      return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  },
  ctx
);

  // メンバー作成のリグエストボディの型
  interface CreateMemberRequestBody {
    memberName: string;
    children: { childName: string }[];
  };

  // メンバー作成
  export const POST = (request: NextRequest, ctx: {params: { teamId: string }}) =>
    withAuthTeam(request, async({ adminId, teamId }) => {
      try {
        const body = await request.json().catch(() => null) as CreateMemberRequestBody | null;
        if (!body) {
          return NextResponse.json({ status: "リクエストの形式が正しくありません" }, { status: 400 });
        }
        const name = body.memberName.trim();
        if (!name) {
          return NextResponse.json({ status: "メンバー名が必須です" }, { status: 400 });
        }

        // 子供のデータが配列か確認
        let rawChildren: { childName: string }[] = [];
        if (Array.isArray(body.children)) {
          rawChildren = body.children;
        }

        // 子供の名前を取り出す
        const trimmedNames = rawChildren.map((child) => {
          if (!child || typeof child.childName !== 'string') return null;
          return child.childName.trim();
        });

        // 空文字 nullを除外
        const validNames = trimmedNames.filter(
          (name): name is string => !!name && name.length > 0);

        // 重複を削除して配列に
        const uniqueChildrenNames = Array.from(new Set(validNames));

        const result = await prisma.$transaction(async (tx) => {
          // 保護者作成
          const member = await tx.member.create({
            data: { name, teamId },
            select: { id : true },
          });

          // 子供をまとめて作成（0件ならスキップ）
          let createdChildren = 0;
          if (uniqueChildrenNames.length > 0) {
            const res = await tx.child.createMany({
              data: uniqueChildrenNames.map((childName) => ({
                name: childName,
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
      } catch (e: any) {
        return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
      }
    },
    ctx
  );