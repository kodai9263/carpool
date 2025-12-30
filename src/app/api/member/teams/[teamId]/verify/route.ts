import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export const POST = async (
  request: NextRequest,
  { params }: { params: { teamId: string } }
) => {
  const teamIdNum = Number(params.teamId);
  const body = await request.json().catch(() => null) as {pin: string}
  const pin = body.pin;

  if (!pin || !Number.isInteger(teamIdNum)) {
    return NextResponse.json({ status: "パラメータが不正です" }, { status: 400 });
  }

  try {
    const team = await prisma.team.findFirst({
      where: { id: teamIdNum },
      select: { viewPinHash: true },
    });

    if (!team?.viewPinHash) {
      return NextResponse.json({ status: "チームが見つかりません" }, { status: 404 });
    }

    const ok = await bcrypt.compare(pin, team.viewPinHash);

    if (!ok) {
      return NextResponse.json({ status: "配車閲覧コードが正しくありません" }, { status: 401 });
    }

    return NextResponse.json({ status: "OK" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
}