import { NextRequest, NextResponse } from "next/server";
import { checkAuth, getAuthAdminId } from "./auth";

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

export async function withAuthTeam(
  request: NextRequest,
  handler: (ctx: { adminId: number; teamId: number }) => Promise<NextResponse>,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // 認証チェック
  const authError = await checkAuth(request);
  if (authError) return authError;

  // adminIdの取得
  const adminId = await getAuthAdminId(request);
  if (!adminId) {
    return NextResponse.json({ status: "権限がありません" }, { status: 401 });
  }

  // teamIdの取得
  const teamId = Number(params.id);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ status: "IDが正しくありません"}, { status: 400 });
  }

  return handler({ adminId, teamId });
}