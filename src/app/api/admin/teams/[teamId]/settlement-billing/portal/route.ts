import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { billingReturnUrl, resolveSettlementBillingReturnPath } from "@/utils/billingCheckout";
import { SETTLEMENT_BILLING_PURPOSE, SettlementBillingError } from "@/utils/settlementBilling";
import { withAuthTeam } from "@/utils/withAuth";

export const runtime = "nodejs";

export const POST = (request: NextRequest, ctx: { params: { teamId: string } }) =>
  withAuthTeam(request, async ({ adminId, teamId }) => {
    try {
      const body = await request.json().catch(() => null) as { returnPath?: unknown } | null;
      const returnPath = await resolveSettlementBillingReturnPath(adminId, teamId, body?.returnPath);
      const subscription = await prisma.teamSettlementSubscription.findUnique({
        where: { teamId },
        include: {
          team: {
            select: {
              admin: {
                select: {
                  supabaseUid: true,
                  pendingTransferNewEmail: true,
                  pendingTransferNewSupabaseUid: true,
                },
              },
            },
          },
        },
      });
      if (!subscription?.stripeCustomerId) {
        return NextResponse.json({ message: "精算プランの支払い情報が見つかりません" }, { status: 400 });
      }
      const currentAdmin = subscription.team.admin;
      if (currentAdmin.pendingTransferNewEmail || currentAdmin.pendingTransferNewSupabaseUid) {
        throw new SettlementBillingError(
          "SETTLEMENT_BILLING_TRANSFER_PENDING",
          "担当者の引継ぎ中は支払い管理を開けません。",
        );
      }
      if (subscription.billingAdminId !== adminId || subscription.billingOwnerSupabaseUid !== currentAdmin.supabaseUid) {
        throw new SettlementBillingError(
          "SETTLEMENT_BILLING_OWNER_CHANGED",
          "この契約は以前の担当者が管理しています。支払い変更は以前の担当者にご確認ください。",
        );
      }
      const stripe = getStripeClient();
      const customer = await stripe.customers.retrieve(subscription.stripeCustomerId);
      if (
        customer.deleted ||
        customer.metadata.billingPurpose !== SETTLEMENT_BILLING_PURPOSE ||
        customer.metadata.settlementTeamId !== String(teamId) ||
        customer.metadata.billingOwnerSupabaseUid !== currentAdmin.supabaseUid
      ) {
        throw new SettlementBillingError("SETTLEMENT_BILLING_INVALID", "精算プランの支払い情報が一致しません");
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: billingReturnUrl(request, returnPath, "settlement_portal=return"),
      });
      return NextResponse.json({ status: "OK", url: session.url });
    } catch (error) {
      if (error instanceof SettlementBillingError) {
        const status = error.code === "SETTLEMENT_BILLING_TRANSFER_PENDING" ? 409 : 403;
        return NextResponse.json({ code: error.code, message: error.message }, { status });
      }
      console.error("Settlement Stripe Portal error:", error);
      return NextResponse.json({ message: "精算プランの支払い管理画面を開けませんでした" }, { status: 500 });
    }
  }, { params: { teamId: ctx.params.teamId } });
