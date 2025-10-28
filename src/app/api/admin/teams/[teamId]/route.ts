
import { TeamResponse, UpdateTeamResponse } from "@/app/_types/response/team"; 
import { withAuthEntry } from "@/utils/withAuth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export const runtime = "nodejs";

// チーム詳細取得(自分のチームのみ)
export const GET = (request: NextRequest, ctx: { params: { id: string } }) =>
  withAuthEntry(request, async ({ adminId, teamId }) => {
    try {
      const team = await prisma.team.findFirst({
        where: { id: teamId, adminId },
        select: { id: true, teamName: true, teamCode: true, memberCount: true, adminId: true },
      });
      if (!team) return NextResponse.json({ status: "not found" }, { status: 404});
      return NextResponse.json({ status: "OK", team } satisfies TeamResponse, { status: 200 });
    } catch (e: any) {
      return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  }, ctx);

interface UpdateTeamBody {
  teamName: string;
  teamCode: string;
}

// チーム更新(自分のチームのみ)
export const PUT = (request: NextRequest, ctx: { params: { id: string } }) =>
  withAuthEntry(request, async ({ adminId, teamId }) => {
    const body = await request.json().catch(() => null) as UpdateTeamBody | null;
    if (!body) {
      return NextResponse.json({ status: "リクエストの形式が正しくありません" }, { status: 400 });
    }
    const name = body.teamName.trim();
    const code = body.teamCode.trim();
    if (!name) return NextResponse.json({ status: "チーム名は必須です" }, { status: 400 });

    try {
      const team = await prisma.team.update({
        where: { id: teamId, adminId },
        data: { teamName: name, teamCode: code },
        select: { id: true, teamName: true, teamCode: true, memberCount: true, adminId: true },
      });
      return NextResponse.json({ status: 'OK', message: '更新しました', team } satisfies UpdateTeamResponse, { status: 200 });
    } catch (e: any) {
      if (e.code === "P2025") {
        return NextResponse.json({ status: "not found" }, { status: 404 });
      }
      return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  }, ctx);

// チーム削除(自分のチームのみ)
export const DELETE = (request: NextRequest, ctx: { params: { id: string } }) =>
  withAuthEntry(request, async ({ adminId, teamId }) => {
    try {
      await prisma.team.deleteMany({
        where: { id: teamId, adminId },
      });
      return NextResponse.json({ status: 'OK', message: '削除しました' }, { status: 200 });
    } catch (e: any) {
      if (e.code === "P2025") {
        return NextResponse.json({ status: "not found"}, { status: 400 });
      }
      return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  }, ctx);
