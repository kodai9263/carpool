
import { checkAuth } from "@/utils/auth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export const runtime = "nodejs";

// チーム詳細取得
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {

  const authError = await checkAuth(request);
  if (authError) return authError;

  const teamId = Number(params.id);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ status: "IDが正しくありません" }, { status: 400 });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, teamName: true, memberCount: true },
    });
    if (!team) return NextResponse.json({ status: "not found" }, { status: 404});
    return NextResponse.json({ status: "OK", team }, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/admin/teams/[id] error", e);
      return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
};

// チーム更新
export const PUT = async (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {

    const authError = await checkAuth(request);
  if (authError) return authError;

  const teamId = Number(params.id);
  if(!Number.isInteger(teamId)) {
    return NextResponse.json({ status: "IDが正しくありません" }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as { teamName?: string } | null;
  const name = body?.teamName?.trim();
  if (!name) return NextResponse.json({ status: "チーム名は必須です" }, { status: 400 });

  try {
    const team = await prisma.team.update({
      where: { id: teamId },
      data: { teamName: name },
      select: { id: true, teamName: true, memberCount: true },
    });
    return NextResponse.json({ status: 'OK', message: '更新しました', team }, { status: 200 });
  } catch (e: any) {
    if (e?.code === "P2025") 
      return NextResponse.json({ status: "not found" }, { status: 404 });
    console.error("PUT /api/admin/teams/[id] error", e);
    return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
};

// チーム削除
export const DELETE = async(
  request: NextRequest,
  { params }: { params: { id: string } },
) => {

  // const authError = await checkAuth(request);
  // if (authError) return authError;

  const teamId = Number(params.id);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ status: "IDが正しくありません" }, { status: 400 });
  }
  
  try {
    await prisma.team.delete({
      where: { id: teamId }
    });
    return NextResponse.json({ status: 'OK', message: '削除しました' }, { status: 200 });
  } catch (e:any) {
    if (e?.code === "P2025")
      return NextResponse.json({ status: "not found"}, { status: 400 });
    console.error("DELETE /api/admin/teams/[id] error", e);
    return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
}