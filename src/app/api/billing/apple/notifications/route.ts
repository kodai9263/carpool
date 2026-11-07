import { NextRequest, NextResponse } from "next/server";
import { verifyAppleNotification } from "@/lib/billing/apple/verification";
import { applyAppleNotification } from "@/lib/billing/apple/service";
import { AppleBillingError } from "@/lib/billing/apple/types";
import { appleErrorResponse, readAppleBody } from "@/lib/billing/apple/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await readAppleBody(request);
    if (typeof body.signedPayload !== "string" || !body.signedPayload) throw new AppleBillingError("invalid_purchase");
    const notification = await verifyAppleNotification(body.signedPayload);
    await applyAppleNotification(notification.transaction);
    return NextResponse.json({ status: "OK" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return appleErrorResponse(error); }
}
