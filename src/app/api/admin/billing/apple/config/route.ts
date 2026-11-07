import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/utils/withAuth";
import { getProEntitlement, hasAppleProAccess } from "@/utils/billing";
import { getAppleBillingConfig } from "@/lib/billing/apple/config";
import { appleErrorResponse } from "@/lib/billing/apple/http";

export const runtime = "nodejs";

export const GET = (request: NextRequest) => withAuth(request, async (adminId) => {
  try {
    const config = getAppleBillingConfig();
    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    const validAccountToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(admin.supabaseUid);
    const hasWebSubscription = admin.billingPlan === "pro" || Boolean(admin.stripeSubscriptionId &&
      !["canceled", "incomplete_expired"].includes(admin.stripeSubscriptionStatus ?? ""));
    const configured = Boolean(config && validAccountToken);
    return NextResponse.json({
      status: "OK",
      apple: {
        configured,
        canPurchase: configured && !hasWebSubscription && !getProEntitlement(admin).isPaidPro,
        appAccountToken: validAccountToken ? admin.supabaseUid.toLowerCase() : "",
        products: config?.products ?? { monthly: "", yearly: "" },
        hasAppleSubscription: hasAppleProAccess(admin),
        hasWebSubscription,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return appleErrorResponse(error); }
});
