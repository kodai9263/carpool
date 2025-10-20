
import { checkAuth } from "@/utils/auth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

// チーム一覧取得
export const GET = async (request: NextRequest) => {
  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    const teams = await prisma.team.findMany({
      select: {
        teamName: true
      },
      orderBy: {
        teamName: 'asc'
      },
    });
    const teamNames = teams.map((t: { teamName: string; }) => t.teamName);

    return NextResponse.json({ status: 'OK', teamNames }, { status: 200 });
  } catch (e: unknown) {
    if (e instanceof Error)
      return NextResponse.json({ status: e.message }, { status: 400 });
  }
};

// チーム作成のリクエストボディの型
interface CreateTeamRequestBody {
  teamName: string;
  teamCode: string;
  adminId: number;
};

// チーム作成
export const POST = async (request: NextRequest) => {
  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    // リクエストボディを取得
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ status: "リクエストの形式が正しくありません" }, { status: 400 });
    }

    const { teamName, teamCode, adminId } = body as Partial<CreateTeamRequestBody>;

    const name = teamName?.trim();
    const code = teamCode?.trim();
    const adminIdNum = Number(adminId);

    if (!name || !code) {
      return NextResponse.json({ status: "teamName と teamCode は必須です" }, { status: 400 });
    }
    if (!Number.isInteger(adminIdNum)) {
      return NextResponse.json({ status: "adminId が不正です" }, { status: 400});
    }

    // チームをDBに生成
    const data = await prisma.team.create({
      data: {
        teamName: name,
        teamCode: code,
        memberCount: 0,
        admin: { connect: { id: adminIdNum } },
      },
      select: { id: true, teamName: true, teamCode: true },
    });

    return NextResponse.json(
      { status: 'OK', message: '作成しました', id: data.id },
      { status: 201 }
    );
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ status: "チームIDが存在します" }, { status: 409 });
    }
    if (e?.code === "P2025") {
      return NextResponse.json({ status: "指定したadminが見つかりません"}, { status: 404 });
    }
    return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
};