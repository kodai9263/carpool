import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSettlementSubscriptionActive, SETTLEMENT_MONTHLY_PRICE_JPY } from "@/utils/settlementAccess";
import { withAuthTeam } from "@/utils/withAuth";

export const runtime = "nodejs";

export const GET = (request: NextRequest, ctx: { params: { teamId: string } }) =>
  withAuthTeam(request, async ({ adminId, teamId }) => {
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
    const status = subscription?.stripeSubscriptionStatus ?? null;
    const transferPending = Boolean(
      subscription?.team.admin.pendingTransferNewEmail ||
      subscription?.team.admin.pendingTransferNewSupabaseUid,
    );
    const canManageBilling = Boolean(
      subscription &&
      subscription.billingAdminId === adminId &&
      subscription.billingOwnerSupabaseUid === subscription.team.admin.supabaseUid &&
      !transferPending &&
      subscription.stripeCustomerId,
    );
    return NextResponse.json({
      status: "OK",
      billing: {
        active: isSettlementSubscriptionActive(status),
        subscriptionStatus: status,
        monthlyPrice: SETTLEMENT_MONTHLY_PRICE_JPY,
        canManageBilling,
        transferPending,
        ownerChanged: Boolean(subscription && subscription.billingOwnerSupabaseUid !== subscription.team.admin.supabaseUid),
      },
    });
  }, { params: { teamId: ctx.params.teamId } });
