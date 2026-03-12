import { CreateRideResponse, RideListResponse } from "@/app/_types/response/rideResponse";
import { RideFormValues } from "@/app/_types/ride"; 
import { prisma } from "@/lib/prisma";
import { withAuthTeam } from "@/utils/withAuth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 配車一覧取得
export const GET = (request: NextRequest, ctx: { params: { teamId: string } }) =>
  withAuthTeam(request, async({ teamId }) => {
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
      const [total, futureCount, totalChildren] = await Promise.all([
        prisma.ride.count({ where: { teamId } }),
        // 未来ライド数（ページ境界計算に使用）
        prisma.ride.count({ where: { teamId, date: { gte: now } } }),
        // チームに属する全子供数を取得
        prisma.child.count({ where: { member: { teamId } } }),
      ]);

      // ページ境界計算（未来: 昇順, 過去: 降順 の混合ソートをDBで処理するため）
      const futureTake = Math.min(perPage, Math.max(0, futureCount - skip));
      const futureSkip = Math.min(skip, futureCount);
      const pastSkip = Math.max(0, skip - futureCount);
      const pastTake = perPage - futureTake;

      const rideSelect = {
        id: true,
        date: true,
        destination: true,
        _count: {
          select: {
            rideAssignments: true,
            childAvailabilities: { where: { availability: false } },
          },
        },
      } as const;

      type RideRow = Awaited<ReturnType<typeof prisma.ride.findMany<{ select: typeof rideSelect }>>>[number];

      // フェーズ2: 必要分だけDBから取得
      const [futureRides, pastRides] = await Promise.all([
        futureTake > 0
          ? prisma.ride.findMany({
              where: { teamId, date: { gte: now } },
              select: rideSelect,
              orderBy: { date: 'asc' },
              skip: futureSkip,
              take: futureTake,
            })
          : Promise.resolve([] as RideRow[]),
        pastTake > 0
          ? prisma.ride.findMany({
              where: { teamId, date: { lt: now } },
              select: rideSelect,
              orderBy: { date: 'desc' },
              skip: pastSkip,
              take: pastTake,
            })
          : Promise.resolve([] as RideRow[]),
      ]);

      const paginatedRides = [...futureRides, ...pastRides];
      const totalPages = Math.max(1, Math.ceil(total / perPage));

      // 各配車に割り当て完了フラグを付与
      const rides = paginatedRides.map((ride) => {
        const notParticipatingCount = ride._count.childAvailabilities;
        const participatingCount = totalChildren - notParticipatingCount;
        return {
          id: ride.id,
          date: ride.date,
          destination: ride.destination,
          isAssignmentComplete: participatingCount > 0 && ride._count.rideAssignments >= participatingCount,
        };
      });

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
  },
  ctx
);

// 配車作成
export const POST = (request: NextRequest, ctx: { params: { teamId: string }}) =>
  withAuthTeam(request, async({ teamId }) => {
    try {
      const body = await request.json().catch(() => null) as RideFormValues | null;
      if (!body) {
        return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 });
      }
      const date = body.date;
      if (!date) {
        return NextResponse.json({ message: "日付を選択してください" }, { status: 400 });
      }

      // 配車をDBに生成
      const data = await prisma.ride.create({
        data: {
          date: date,
          destination: body.destination.trim(),
          team: { connect: { id: teamId } },
        },
        select: { id: true, date: true, destination: true },
      });

      return NextResponse.json(
        { status: "OK", message: "作成しました", id: data.id } satisfies CreateRideResponse,
        { status: 201 }
      );
    } catch {
      return NextResponse.json({ message: "サーバ内部でエラーが発生しました" }, { status: 500 });
    }
  },
  ctx
);