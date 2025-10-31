import { NextRequest, NextResponse } from "next/server";
import { checkAuth, getAuthAdminId } from "./auth";
import { prisma } from "@/lib/prisma";


export async function withAuth(
  request: NextRequest,
  handler: (adminId: number) => Promise<NextResponse>
): Promise<NextResponse> {
  // 認証チェック
  const authError = await checkAuth(request);
  if (authError) return authError;

  // adminIdの取得
  const adminId = await getAuthAdminId(request);
  if (!adminId) {
    return NextResponse.json({ status: "権限がありません" }, { status: 401 });
  }

  return handler(adminId);
}

export async function withAuthEntry(
  request: NextRequest,
  handler: (ctx: { adminId: number; teamId: number }) => Promise<NextResponse>,
  { params }: { params: { teamId: string } }
): Promise<NextResponse> {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const adminId = await getAuthAdminId(request);
  if (!adminId) {
    return NextResponse.json({ status: "権限がありません" }, { status: 401 });
  }

  // teamIdの取得
  const teamId = Number(params.teamId);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ status: "IDが正しくありません"}, { status: 400 });
  }

  return handler({ adminId, teamId });
}

export async function withAuthTeam(
  request: NextRequest,
  handler: (ctx: { adminId: number; teamId: number }) => Promise<NextResponse>,
  { params } : { params: { id: string } }
): Promise<NextResponse> {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const adminId = await getAuthAdminId(request);
  if (!adminId) {
    return NextResponse.json({ status: "権限がありません" }, { status: 401 })
  }

  const teamId = Number(params.id);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ status: "IDが正しくありません"}, { status: 400 });
  }

  // チーム所有チェック
  const owned = await prisma.team.findFirst({
    where: { id: teamId, adminId },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ status: "チームが見つかりません"}, { status: 404 });
  }

  return handler({ adminId, teamId });
}

export async function withAdminTeamMember(
  request: NextRequest,
  handler: (ctx: { adminId: number; teamId: number; memberId: number }) => Promise<NextResponse>,
  { params }: { params: { teamId: string; memberId: string } }
): Promise<NextResponse> {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const adminId = await getAuthAdminId(request);
  if (!adminId) {
    return NextResponse.json({ status: "権限がありません" }, { status: 401 })
  }

  const teamId = Number(params.teamId);
  const memberId = Number(params.memberId);
  if (!Number.isInteger(teamId) || !Number.isInteger(memberId)) {
    return NextResponse.json({ status: "IDが正しくありません" }, { status: 400 });
  }

  const owned = await prisma.team.findFirst({
    where: { id: teamId, adminId },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ status: "チームが見つかりません"}, { status: 404 });
  }

  return handler({ adminId, teamId, memberId });
}