import { RideListResponse } from "@/app/_types/response/rideResponse";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = async (request: NextRequest, { params }: { params: { teamId: string } }) => {
  const pin = request.headers.get('x-pin');
  const teamIdNum = Number(params.teamId);
  if (!pin || !Number.isInteger(teamIdNum)) {
    return NextResponse.json({ message: "権限がありません" }, { status: 401 });
  }

  const team = await prisma.team.findFirst({
    where: { id: teamIdNum },
    select: { viewPinHash: true },
  });
  if (!team?.viewPinHash) return NextResponse.json({ message: "チームが見つかりません"}, { status: 404 });
  
  const ok = await bcrypt.compare(pin, team.viewPinHash);
  if (!ok) return NextResponse.json({ message: "配車閲覧コードが正しくありません"}, { status: 401});

  try {
    const { searchParams } = new URL(request.url);
    const p = Number(searchParams.get("page"));
    const pp = Number(searchParams.get("perPage"));
    const page = Number.isFinite(p) && p > 0 ? Math.floor(p) : 1;
    const perPage = Number.isFinite(pp) && pp > 0 ? Math.min(50, Math.floor(pp)) : 10;
    const skip = (page - 1) * perPage;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const [total, futureRides, pastRides] = await Promise.all([
      prisma.ride.count({ where: { teamId: teamIdNum } }),
      prisma.ride.findMany({
        where: {
          teamId: teamIdNum,
          date: { gte: now }
        },
        select: { id: true, date: true },
        orderBy: { date : 'asc' },
      }),
      prisma.ride.findMany({
        where: {
          teamId: teamIdNum,
          date: { lt: now }
        },
        select: { id: true, date: true },
        orderBy: { date: 'desc' },
      }),
    ]);

    const allRides = [...futureRides, ...pastRides];

    const rides = allRides.slice(skip, skip + perPage);
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return NextResponse.json(
      { status: "OK", rides, page, perPage, total, totalPages } satisfies RideListResponse,
      { status: 200 }
    );
  } catch (e: unknown) {
    if (e instanceof Error) {
      return NextResponse.json({ message: e.message }, { status: 400 });
    }
      return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
}