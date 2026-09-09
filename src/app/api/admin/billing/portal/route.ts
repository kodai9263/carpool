import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { billingReturnUrl, resolveBillingReturnPath } from "@/utils/billingCheckout";
import { trackServerEvent } from "@/utils/serverAnalytics";
import { withAuth } from "@/utils/withAuth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";


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

      if (!admin.stripeCustomerId) {
        return NextResponse.json(
          { message: "支払い情報が見つかりません" },
          { status: 400 },
        );
      }

      const stripe = getStripeClient();
      const body = await request.json().catch(() => null);
      const returnPath = await resolveBillingReturnPath(adminId, body?.returnPath);
      const session = await stripe.billingPortal.sessions.create({
        customer: admin.stripeCustomerId,
        return_url: billingReturnUrl(request, returnPath, "portal=return"),
      });

      await trackServerEvent(
        "billing_portal_opened",
        {
          admin_id: admin.id,
          plan: admin.billingPlan,
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
