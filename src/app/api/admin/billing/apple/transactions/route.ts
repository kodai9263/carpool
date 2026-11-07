import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/utils/withAuth";
import { getProEntitlement } from "@/utils/billing";
import { verifyApplePurchase } from "@/lib/billing/apple/verification";
import { saveAppleSubscription } from "@/lib/billing/apple/service";
import { AppleBillingError } from "@/lib/billing/apple/types";
import { appleErrorResponse, readAppleBody } from "@/lib/billing/apple/http";

export const runtime = "nodejs";

export const POST = (request: NextRequest) => withAuth(request, async (adminId) => {
  try {
    const body = await readAppleBody(request);
    if ((body.signedTransaction !== undefined && typeof body.signedTransaction !== "string") ||
      (body.transactionId !== undefined && typeof body.transactionId !== "string") ||
      (!body.signedTransaction && !body.transactionId)) throw new AppleBillingError("invalid_purchase");
    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId }, select: { supabaseUid: true } });
    const transaction = await verifyApplePurchase({
      signedTransaction: body.signedTransaction as string | undefined,
      transactionId: body.transactionId as string | undefined,
    }, admin.supabaseUid);
    await saveAppleSubscription(adminId, transaction);
    const updated = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    return NextResponse.json({ status: "OK", mobileAccess: getProEntitlement(updated).isPaidPro }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return appleErrorResponse(error); }
});
