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

    // フェーズ1: カウント取得（ページ境界計算に必要）
    const [total, futureCount] = await Promise.all([
      prisma.ride.count({ where: { teamId: teamIdNum } }),
      prisma.ride.count({ where: { teamId: teamIdNum, date: { gte: now } } }),
    ]);

    // ページ境界計算（未来: 昇順, 過去: 降順 の混合ソートをDBで処理するため）
    const futureTake = Math.min(perPage, Math.max(0, futureCount - skip));
    const futureSkip = Math.min(skip, futureCount);
    const pastSkip = Math.max(0, skip - futureCount);
    const pastTake = perPage - futureTake;

    const rideSelect = { id: true, date: true, destination: true } as const;
    type RideRow = Awaited<ReturnType<typeof prisma.ride.findMany<{ select: typeof rideSelect }>>>[number];

    // フェーズ2: 必要分だけDBから取得
    const [futureRides, pastRides] = await Promise.all([
      futureTake > 0
        ? prisma.ride.findMany({
            where: { teamId: teamIdNum, date: { gte: now } },
            select: rideSelect,
            orderBy: { date: 'asc' },
            skip: futureSkip,
            take: futureTake,
          })
        : Promise.resolve([] as RideRow[]),
      pastTake > 0
        ? prisma.ride.findMany({
            where: { teamId: teamIdNum, date: { lt: now } },
            select: rideSelect,
            orderBy: { date: 'desc' },
            skip: pastSkip,
            take: pastTake,
          })
        : Promise.resolve([] as RideRow[]),
    ]);

    const rides = [...futureRides, ...pastRides];
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