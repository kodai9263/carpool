import { CreateRideResponse, RideListResponse } from "@/app/_types/response/ride";
import { RideFormValues } from "@/app/_types/ride";
import { withAuthTeam } from "@/utils/withAuth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export const runtime = "nodejs";

// 配車一覧取得
export const GET = (request: NextRequest, ctx: { params: { teamId: string } }) =>
  withAuthTeam(request, async({ adminId, teamId }) => {
    try {
      const { searchParams } = new URL(request.url);
      const p = Number(searchParams.get("page"));
      const pp = Number(searchParams.get("perPage"));
      const page = Number.isFinite(p) && p > 0 ? Math.floor(p) : 1;
      const perPage = Number.isFinite(pp) && pp > 0 ? Math.min(50, Math.floor(pp)) : 10;
      const skip = (page - 1) * perPage;

      const [total, rides] = await Promise.all([
        prisma.ride.count({ where: { teamId } }),
        prisma.ride.findMany({
          where: { teamId },
          select: { id: true, date: true },
          orderBy: { date : 'desc' },
          skip,
          take: perPage,
        }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / perPage));

      return NextResponse.json(
        { status: "OK", rides, page, perPage, total, totalPages } satisfies RideListResponse,
        { status: 200 }
      );
    } catch (e: unknown) {
      if (e instanceof Error) {
        return NextResponse.json({ status: e.message }, { status: 400 });
      }
      return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  },
  ctx
);

// 配車作成
export const POST = (request: NextRequest, ctx: { params: { teamId: string }}) =>
  withAuthTeam(request, async({ adminId, teamId }) => {
    try {
      const body = await request.json().catch(() => null) as RideFormValues | null;
      if (!body) {
        return NextResponse.json({ status: "リクエストの形式が正しくありません" }, { status: 400 });
      }
      const date = body.date;
      if (!date) {
        return NextResponse.json({ status: "日付を選択してください" }, { status: 400 });
      }

      // 配車をDBに生成
      const data = await prisma.ride.create({
        data: {
          date: body.date,
          destination: body.destination.trim(),
          team: { connect: { id: teamId } },
        },
        select: { id: true, date: true, destination: true },
      });

      return NextResponse.json(
        { status: "OK", message: "作成しました", id: data.id } satisfies CreateRideResponse,
        { status: 201 }
      );
    } catch (e: any) {
      return NextResponse.json({ status: "サーバ内部でエラーが発生しました" }, { status: 500 });
    }
  },
  ctx
);