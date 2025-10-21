
import { TeamResponse } from "@/app/_types/response";
import { checkAuth, getAuthAdminId } from "@/utils/auth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export const runtime = "nodejs";

// チーム詳細取得(自分のチームのみ)
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {

  const authError = await checkAuth(request);
  if (authError) return authError;

  // ログイン中のユーザーを取得
  const adminId = await getAuthAdminId(request);
  if (!adminId) return NextResponse.json({ status: "権限がありません" }, { status: 401 });

  // チームIDを取得
  const teamId = Number(params.id);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ status: "IDが正しくありません" }, { status: 400 });
  }

  try {
    const team = await prisma.team.findFirst({
      where: { id: teamId, adminId },
      select: { id: true, teamName: true, teamCode: true, memberCount: true, adminId: true },
    });
    if (!team) return NextResponse.json({ status: "not found" }, { status: 404});
    return NextResponse.json({ status: "OK", team } satisfies TeamResponse, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/admin/teams/[id] error", e);
      return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
};

interface UpdateTeamBody {
  teamName: string;
}

// チーム更新(自分のチームのみ)
export const PUT = async (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {

  const authError = await checkAuth(request);
  if (authError) return authError;

  // ログイン中のユーザーを取得
  const adminId = await getAuthAdminId(request);
  if (!adminId) return NextResponse.json({ status: "権限がありません" }, { status: 401 });

  // チームIDを取得
  const teamId = Number(params.id);
  if(!Number.isInteger(teamId)) {
    return NextResponse.json({ status: "IDが正しくありません" }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as Partial<UpdateTeamBody> | null;
  const name = body?.teamName?.trim();
  if (!name) return NextResponse.json({ status: "チーム名は必須です" }, { status: 400 });

  try {
    const team = await prisma.team.update({
      where: { id: teamId, adminId },
      data: { teamName: name },
      select: { id: true, teamName: true, memberCount: true, adminId: true },
    });
    return NextResponse.json({ status: 'OK', message: '更新しました', team }, { status: 200 });
  } catch (e: any) {
    if (e?.code === "P2025") 
      return NextResponse.json({ status: "not found" }, { status: 404 });
    console.error("PUT /api/admin/teams/[id] error", e);
    return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
};

// チーム削除(自分のチームのみ)
export const DELETE = async(
  request: NextRequest,
  { params }: { params: { id: string } },
) => {

  const authError = await checkAuth(request);
  if (authError) return authError;

  // ログイン中のユーザーを取得
  const adminId = await getAuthAdminId(request);
  if (!adminId) return NextResponse.json({ status: "権限がありません" }, { status: 401 });

  // チームIDを取得
  const teamId = Number(params.id);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ status: "IDが正しくありません" }, { status: 400 });
  }
  
  try {
    await prisma.team.deleteMany({
      where: { id: teamId, adminId },
    });
    return NextResponse.json({ status: 'OK', message: '削除しました' }, { status: 200 });
  } catch (e:any) {
    if (e?.code === "P2025")
      return NextResponse.json({ status: "not found"}, { status: 400 });
    console.error("DELETE /api/admin/teams/[id] error", e);
    return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
}