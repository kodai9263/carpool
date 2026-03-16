import { NextRequest, NextResponse } from "next/server";
import { getAuthAdminId, getAuthAdminIdWithTeam } from "./auth";


export async function withAuth(
  request: NextRequest,
  handler: (adminId: number) => Promise<NextResponse>
): Promise<NextResponse> {
  // 認証チェック + adminIdの取得
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
  { params } : { params: { teamId: string } }
): Promise<NextResponse> {
  const teamId = Number(params.teamId);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ status: "IDが正しくありません"}, { status: 400 });
  }

  // AdminId取得 + チーム所有確認を1クエリで実行
  const adminId = await getAuthAdminIdWithTeam(request, teamId);
  if (!adminId) {
    return NextResponse.json({ status: "権限がありません" }, { status: 401 });
  }

  return handler({ adminId, teamId });
}

export async function withAdminTeamMember(
  request: NextRequest,
  handler: (ctx: { adminId: number; teamId: number; memberId: number }) => Promise<NextResponse>,
  { params }: { params: { teamId: string; memberId: string } }
): Promise<NextResponse> {
  const teamId = Number(params.teamId);
  const memberId = Number(params.memberId);
  if (!Number.isInteger(teamId) || !Number.isInteger(memberId)) {
    return NextResponse.json({ status: "IDが正しくありません" }, { status: 400 });
  }

  // AdminId取得 + チーム所有確認を1クエリで実行
  const adminId = await getAuthAdminIdWithTeam(request, teamId);
  if (!adminId) {
    return NextResponse.json({ status: "権限がありません" }, { status: 401 });
  }

  return handler({ adminId, teamId, memberId });
}

export async function withAdminTeamRide(
  request: NextRequest,
  handler: (ctx: { adminId: number; teamId: number; rideId: number }) => Promise<NextResponse>,
  { params }: { params: { teamId: string; rideId: string } }
): Promise<NextResponse> {
  const teamId = Number(params.teamId);
  const rideId = Number(params.rideId);
  if (!Number.isInteger(teamId) || !Number.isInteger(rideId)) {
    return NextResponse.json({ status: "IDが正しくありません" }, { status: 400 });
  }

  // AdminId取得 + チーム所有確認を1クエリで実行
  const adminId = await getAuthAdminIdWithTeam(request, teamId);
  if (!adminId) {
    return NextResponse.json({ status: "権限がありません" }, { status: 401 });
  }

  return handler({ adminId, teamId, rideId });
}