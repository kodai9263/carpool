import { CreateTeamResponse, TeamsListResponse } from "@/app/_types/response/team"; 
import { TeamFormValues } from "@/app/_types/Team";
import { withAuth } from "@/utils/withAuth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

// チーム一覧取得
export const GET = (request: NextRequest) => {
  return withAuth(request, async (adminId) => {
    try {
      const { searchParams } = new URL(request.url); // URL解析
      const p = Number(searchParams.get("page")); // ページ番号取得
      const pp = Number(searchParams.get("perPage")); // 件数取得
      const page = Number.isFinite(p) && p > 0 ? Math.floor(p) : 1; // ページ番号検証
      const perPage = Number.isFinite(pp) && pp > 0 ? Math.min(50, Math.floor(pp)) : 5; // 件数検証
      const skip = (page - 1) * perPage; // DBクエリ用スキップ

      const [total, teams] = await Promise.all([
        prisma.team.count({ where: { adminId } }),
        prisma.team.findMany({
          where: { adminId },
          select: { id: true, teamName: true },
          orderBy: { teamName: 'asc'},
          skip,
          take: perPage,
        }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / perPage));
    
      return NextResponse.json(
        { status: "OK", teams, page, perPage, total, totalPages } satisfies TeamsListResponse,
        { status: 200 }
      );
    } catch (e: unknown) {
      if (e instanceof Error) {
        return NextResponse.json({ status: e.message }, { status: 400 });
      }
      return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  });
};

// チーム作成
export const POST = (request: NextRequest) => {
  return withAuth(request, async (adminId) => {
    try {
      // リクエストボディを取得
      const body = await request.json().catch(() => null) as TeamFormValues | null;
      if (!body) {
        return NextResponse.json({ status: "リクエストの形式が正しくありません" }, { status: 400 });
      }

      const { teamName, teamCode } = body as TeamFormValues;

      const name = teamName.trim();
      const code = teamCode.trim();

      if (!name || !code) {
        return NextResponse.json({ status: "チーム名とチームIDは必須です" }, { status: 400 });
      }
      if (!Number.isInteger(adminId)) {
        return NextResponse.json({ status: "IDが不正です" }, { status: 400});
      }

      // チームをDBに生成
      const data = await prisma.team.create({
        data: {
          teamName: name,
          teamCode: code,
          memberCount: 0,
          admin: { connect: { id: adminId } },
        },
        select: { id: true, teamName: true, teamCode: true },
      });

      return NextResponse.json(
        { status: "OK", message: "作成しました", id: data.id } satisfies CreateTeamResponse,
        { status: 201 }
      );
    } catch (e: any) {
      if (e?.code === "P2002") {
        return NextResponse.json({ status: "チームIDが存在します" }, { status: 409 });
      }
      if (e?.code === "P2025") {
        return NextResponse.json({ status: "指定したIDが見つかりません"}, { status: 404 });
      }
      return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  });
};