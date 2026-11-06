import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSettlementSubscriptionActive, SETTLEMENT_MONTHLY_PRICE_JPY } from "@/utils/settlementAccess";
import { getProEntitlement } from "@/utils/billing";
import { withAuthTeam } from "@/utils/withAuth";

export const runtime = "nodejs";

export const GET = (request: NextRequest, ctx: { params: { teamId: string } }) =>
  withAuthTeam(request, async ({ adminId, teamId }) => {
    const team = await prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      select: {
        admin: {
          select: {
            billingPlan: true,
            proTrialEndsAt: true,
            stripeCustomerId: true,
            supabaseUid: true,
            pendingTransferNewEmail: true,
            pendingTransferNewSupabaseUid: true,
          },
        },
        settlementSubscription: true,
      },
    });
    const subscription = team.settlementSubscription;
    const status = subscription?.stripeSubscriptionStatus ?? null;
    const entitlement = getProEntitlement(team.admin);
    const legacyActive = isSettlementSubscriptionActive(status);
    const transferPending = Boolean(
      team.admin.pendingTransferNewEmail ||
      team.admin.pendingTransferNewSupabaseUid,
    );
    const canManageLegacyBilling = Boolean(
      subscription &&
      subscription.billingAdminId === adminId &&
      subscription.billingOwnerSupabaseUid === team.admin.supabaseUid &&
      !transferPending &&
      subscription.stripeCustomerId,
    );
    return NextResponse.json({
      status: "OK",
      billing: {
        active: entitlement.isPro || legacyActive,
        accessSource: entitlement.isPro ? entitlement.accessSource : legacyActive ? "legacy" : "free",
        subscriptionStatus: status,
        monthlyPrice: SETTLEMENT_MONTHLY_PRICE_JPY,
        canManageBilling: entitlement.isPaidPro ? Boolean(team.admin.stripeCustomerId) : canManageLegacyBilling,
        managementSource: entitlement.isPaidPro ? "pro" : canManageLegacyBilling ? "legacy" : null,
        transferPending,
        ownerChanged: Boolean(subscription && subscription.billingOwnerSupabaseUid !== team.admin.supabaseUid),
      },
    });
  }, { params: { teamId: ctx.params.teamId } });
