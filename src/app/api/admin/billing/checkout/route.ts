import { prisma } from "@/lib/prisma";
import { getStripeClient, getStripeProPriceId } from "@/lib/stripe";
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
          email: true,
          billingPlan: true,
          stripeCustomerId: true,
        },
      });

      if (!admin) {
        return NextResponse.json({ message: "管理者が見つかりません" }, { status: 404 });
      }

      if (admin.billingPlan === "pro") {
        return NextResponse.json(
          { message: "すでにProプランを利用中です" },
          { status: 400 },
        );
      }

      const stripe = getStripeClient();
      const priceId = getStripeProPriceId();
      const appUrl = getAppUrl(request);

      let customerId = admin.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: admin.email,
          metadata: { adminId: String(admin.id) },
        });
        customerId = customer.id;

        await prisma.admin.update({
          where: { id: admin.id },
          data: { stripeCustomerId: customerId },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/admin/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}#plan`,
        cancel_url: `${appUrl}/admin/profile?checkout=cancel#plan`,
        client_reference_id: String(admin.id),
        metadata: { adminId: String(admin.id) },
        subscription_data: {
          metadata: { adminId: String(admin.id) },
        },
      });

      await trackServerEvent(
        "checkout_started",
        {
          admin_id: admin.id,
          plan: "pro",
          price_id: priceId,
        },
        { adminId, request },
      );

      return NextResponse.json({ status: "OK", url: session.url }, { status: 200 });
    } catch (error) {
      console.error("Stripe Checkout error:", error);
      return NextResponse.json(
        { message: "決済ページを開けませんでした" },
        { status: 500 },
      );
    }
  });
