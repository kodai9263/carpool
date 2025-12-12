import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { AvailabilityFormValues } from "@/app/_types/availability";
import { AvailabilityResponse } from "@/app/_types/response/availabilityResponse";

export const runtime = "nodejs";

export const POST = async (request: NextRequest, { params }: { params: { teamId: string; rideId: string } }) => {
  const pin = request.nextUrl.searchParams.get("pin");
  const teamIdNum = Number(params.teamId);
  const rideIdNum = Number(params.rideId);

  const body = await request.json().catch(() => null) as AvailabilityFormValues | null;
  const { memberId, availability, seats } = body ?? {};

  if (!pin || !Number.isInteger(teamIdNum) || !Number.isInteger(rideIdNum)) {
    return NextResponse.json({ status: "権限がありません" }, { status: 401 });
  }
  if (!body || !Number.isInteger(memberId) || typeof availability !== "boolean" || !Number.isInteger(seats)) {
    return NextResponse.json({ status: "リクエストの形式が正しくありません" }, { status: 400});
  }

  // PIN認可
  const team = await prisma.team.findFirst({ where: { id: teamIdNum }, select: { viewPinHash: true } });
  if (!team?.viewPinHash) return NextResponse.json({ status: "チームが見つかりません" }, { status: 404 });
  const ok = await bcrypt.compare(pin, team.viewPinHash);
  if (!ok) return NextResponse.json({ status: "配車閲覧コードが正しくありません" }, { status: 401 });

  try {
  const data = await prisma.availabilityDriver.upsert({
    where: { rideId_memberId: { rideId: rideIdNum, memberId: memberId! } },
    update: {
      availability,
      seats,
      teamId: teamIdNum,
    },
    create: {
      rideId: rideIdNum,
      memberId: memberId!,
      teamId: teamIdNum,
      availability,
      seats,
    },
    select: { id: true, availability: true, seats: true, memberId: true, rideId: true },
  });

    return NextResponse.json(
      { status: "OK", message: "更新しました", availabilityDriver: data } satisfies AvailabilityResponse,
      { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ status: "サーバ内部でエラーが発生しました" }, { status: 500 });
  }
};