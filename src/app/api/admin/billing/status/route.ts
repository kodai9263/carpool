import { getAutoAssignBillingStatus } from "@/utils/billingServer";
import { withAuth } from "@/utils/withAuth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = (request: NextRequest) =>
  withAuth(request, async (adminId) => {
    try {
      const autoAssign = await getAutoAssignBillingStatus(adminId);

      return NextResponse.json(
        {
          status: "OK",
          billing: {
            plan: autoAssign.plan,
            isPro: autoAssign.isPro,
          },
          autoAssign,
        },
        { status: 200 },
      );
    } catch {
      return NextResponse.json(
        { message: "プラン情報の取得に失敗しました" },
        { status: 500 },
      );
    }
  });
