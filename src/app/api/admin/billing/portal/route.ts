import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { isProPlan } from "@/utils/billing";
import { trackServerEvent } from "@/utils/serverAnalytics";
import { withAuth } from "@/utils/withAuth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getAppUrl(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin).replace(/\/$/, "");
}

export const POST = (request: NextRequest) =>
  withAuth(request, async (adminId) => {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          billingPlan: true,
          stripeCustomerId: true,
        },
      });

      if (!admin) {
        return NextResponse.json({ message: "管理者が見つかりません" }, { status: 404 });
      }

      if (!isProPlan(admin.billingPlan) || !admin.stripeCustomerId) {
        return NextResponse.json(
          { message: "Proプランの支払い情報が見つかりません" },
          { status: 400 },
        );
      }

      const stripe = getStripeClient();
      const appUrl = getAppUrl(request);
      const session = await stripe.billingPortal.sessions.create({
        customer: admin.stripeCustomerId,
        return_url: `${appUrl}/admin/profile?portal=return#plan`,
      });

      await trackServerEvent(
        "billing_portal_opened",
        {
          admin_id: admin.id,
          plan: "pro",
        },
        { adminId, request },
      );

      return NextResponse.json({ status: "OK", url: session.url }, { status: 200 });
    } catch (error) {
      console.error("Stripe Customer Portal error:", error);
      return NextResponse.json(
        { message: "支払い管理画面を開けませんでした" },
        { status: 500 },
      );
    }
  });
