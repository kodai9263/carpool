import { prisma } from "@/lib/prisma";
import { getStripeClient, getStripeProPriceId } from "@/lib/stripe";
import { trackServerEvent } from "@/utils/serverAnalytics";
import { withAuth } from "@/utils/withAuth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getAppUrl(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin).replace(/\/$/, "");
}

type CheckoutAdmin = {
  id: number;
  email: string;
};

type StripeResourceError = {
  code?: string;
  param?: string;
  message?: string;
  raw?: {
    code?: string;
    param?: string;
    message?: string;
  };
};

function isMissingStripeCustomerError(error: unknown) {
  const stripeError = error as StripeResourceError;
  const code = stripeError.code ?? stripeError.raw?.code;
  const param = stripeError.param ?? stripeError.raw?.param;
  const message = stripeError.message ?? stripeError.raw?.message ?? "";

  return code === "resource_missing" && (param === "customer" || message.includes("No such customer"));
}

async function createCustomerForAdmin(
  stripe: ReturnType<typeof getStripeClient>,
  admin: CheckoutAdmin,
) {
  const customer = await stripe.customers.create({
    email: admin.email,
    metadata: { adminId: String(admin.id) },
  });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

function createCheckoutSession(
  stripe: ReturnType<typeof getStripeClient>,
  params: {
    adminId: number;
    customerId: string;
    priceId: string;
    appUrl: string;
  },
) {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: params.customerId,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: `${params.appUrl}/admin/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}#plan`,
    cancel_url: `${params.appUrl}/admin/profile?checkout=cancel#plan`,
    client_reference_id: String(params.adminId),
    metadata: { adminId: String(params.adminId) },
    subscription_data: {
      metadata: { adminId: String(params.adminId) },
    },
  });
}

export const POST = (request: NextRequest) =>
  withAuth(request, async (adminId) => {
    try {
      // 支払い間隔（月払い/年払い）をリクエストから取得（未指定は月払い）
      const body = await request.json().catch(() => null) as { interval?: string } | null;
      const interval = body?.interval === "year" ? "year" : "month";

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
      const priceId = getStripeProPriceId(interval);
      const appUrl = getAppUrl(request);

      let customerId = admin.stripeCustomerId;
      if (!customerId) {
        customerId = await createCustomerForAdmin(stripe, admin);
      }

      let session;
      try {
        session = await createCheckoutSession(stripe, {
          adminId: admin.id,
          customerId,
          priceId,
          appUrl,
        });
      } catch (error) {
        if (!admin.stripeCustomerId || !isMissingStripeCustomerError(error)) {
          throw error;
        }

        console.warn(`Stripe customer not found. Recreating customer for admin ${admin.id}.`);
        customerId = await createCustomerForAdmin(stripe, admin);
        session = await createCheckoutSession(stripe, {
          adminId: admin.id,
          customerId,
          priceId,
          appUrl,
        });
      }

      await trackServerEvent(
        "checkout_started",
        {
          admin_id: admin.id,
          plan: "pro",
          price_id: priceId,
          interval,
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
