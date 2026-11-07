import { getAutoAssignBillingStatus } from "@/utils/billingServer";
import { withAuth } from "@/utils/withAuth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = async (request: NextRequest) => {
  const response = await withAuth(request, async (adminId) => {
    try {
      const autoAssign = await getAutoAssignBillingStatus(adminId);

      return NextResponse.json(
        {
          status: "OK",
          billing: {
            plan: autoAssign.plan,
            isPro: autoAssign.isPro,
            isPaidPro: autoAssign.isPaidPro,
            mobileAccess: autoAssign.isPaidPro === true,
            isTrialActive: autoAssign.isTrialActive,
            accessSource: autoAssign.accessSource,
            trialEndsAt: autoAssign.trialEndsAt,
            trialDaysRemaining: autoAssign.trialDaysRemaining,
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

  response.headers.set("Cache-Control", "private, no-store");
  return response;
};
