import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripeClient, getValidatedStripeSettlementPrice } from "@/lib/stripe";
import {
  billingReturnUrl,
  resolveSettlementBillingReturnPath,
  stripeId,
} from "@/utils/billingCheckout";
import {
  isSettlementSubscriptionTerminal,
  recordSettlementCheckoutConversion,
  SETTLEMENT_BILLING_PURPOSE,
  SettlementBillingError,
  syncSettlementSubscription,
} from "@/utils/settlementBilling";
import { withAuthTeam } from "@/utils/withAuth";

export const runtime = "nodejs";

type Context = { params: { teamId: string } };

function checkoutMetadata(teamId: number, adminId: number, ownerUid: string, priceId: string, productId: string) {
  return {
    billingPurpose: SETTLEMENT_BILLING_PURPOSE,
    settlementTeamId: String(teamId),
    billingAdminId: String(adminId),
    billingOwnerSupabaseUid: ownerUid,
    settlementPriceId: priceId,
    settlementProductId: productId,
  };
}

function billingErrorResponse(error: unknown) {
  if (error instanceof SettlementBillingError) {
    const status = error.code === "SETTLEMENT_BILLING_TRANSFER_PENDING" ? 409 : 403;
    return NextResponse.json({ code: error.code, message: error.message }, { status });
  }
  if ((error as { code?: string }).code === "BILLING_UNAVAILABLE") {
    return NextResponse.json({ message: "現在、精算プランの決済を利用できません。" }, { status: 503 });
  }
  return null;
}

async function replaceExpiredReservation(input: {
  teamId: number;
  adminId: number;
  ownerUid: string;
  returnPath: string;
  reservationId: number;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "TeamSettlementSubscription" WHERE "teamId" = ${input.teamId} FOR UPDATE`;
    const subscription = await tx.teamSettlementSubscription.findUniqueOrThrow({ where: { teamId: input.teamId } });
    if (
      subscription.billingAdminId !== input.adminId ||
      subscription.billingOwnerSupabaseUid !== input.ownerUid
    ) {
      throw new SettlementBillingError("SETTLEMENT_BILLING_OWNER_CHANGED", "精算プランの担当者が変更されました");
    }
    const activeKey = `settlement-team:${input.teamId}`;
    const active = await tx.settlementCheckoutReservation.findUnique({ where: { activeKey } });
    // 別リクエストが先に新しい予約へ交換済みなら、その予約と冪等キーを共有する。
    if (active && active.id !== input.reservationId) return active;
    if (active) {
      await tx.settlementCheckoutReservation.update({
        where: { id: active.id },
        data: { status: "expired", activeKey: null },
      });
    }
    return tx.settlementCheckoutReservation.create({
      data: {
        operationKey: randomUUID(),
        activeKey,
        teamId: input.teamId,
        billingAdminId: input.adminId,
        billingOwnerSupabaseUid: input.ownerUid,
        returnPath: input.returnPath,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }, { maxWait: 3000, timeout: 10000 });
}

export const POST = (request: NextRequest, ctx: Context) =>
  withAuthTeam(request, async ({ adminId, teamId }) => {
    try {
      const body = await request.json().catch(() => null) as { returnPath?: unknown } | null;
      const returnPath = await resolveSettlementBillingReturnPath(adminId, teamId, body?.returnPath);
      // 設定・商品・料金の検証は、予約作成や顧客作成より先に完了させる。
      const stripe = getStripeClient();
      const { priceId, productId } = await getValidatedStripeSettlementPrice();
      const now = new Date();
      const reservationContext = await prisma.$transaction(async (tx) => {
        const team = await tx.team.findFirst({
          where: { id: teamId, adminId },
          select: {
            id: true,
            adminId: true,
            admin: {
              select: {
                email: true,
                supabaseUid: true,
                pendingTransferNewEmail: true,
                pendingTransferNewSupabaseUid: true,
              },
            },
          },
        });
        if (!team) throw new SettlementBillingError("SETTLEMENT_BILLING_INVALID", "チームが見つかりません");
        if (team.admin.pendingTransferNewEmail || team.admin.pendingTransferNewSupabaseUid) {
          throw new SettlementBillingError(
            "SETTLEMENT_BILLING_TRANSFER_PENDING",
            "担当者の引継ぎ中は精算プランを申し込めません。引継ぎ完了後にお試しください。",
          );
        }
        await tx.$executeRaw`
          INSERT INTO "TeamSettlementSubscription" (
            "teamId", "billingAdminId", "billingOwnerSupabaseUid", "billingOwnerEmail", "createdAt", "updatedAt"
          ) VALUES (
            ${teamId}, ${adminId}, ${team.admin.supabaseUid}, ${team.admin.email}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) ON CONFLICT ("teamId") DO NOTHING
        `;
        await tx.$queryRaw`SELECT "id" FROM "TeamSettlementSubscription" WHERE "teamId" = ${teamId} FOR UPDATE`;
        let subscription = await tx.teamSettlementSubscription.findUniqueOrThrow({ where: { teamId } });
        if (subscription.billingOwnerSupabaseUid !== team.admin.supabaseUid) {
          if (subscription.stripeSubscriptionId && !isSettlementSubscriptionTerminal(subscription.stripeSubscriptionStatus)) {
            throw new SettlementBillingError(
              "SETTLEMENT_BILLING_OWNER_CHANGED",
              "この契約は以前の担当者が管理しています。精算機能は利用できますが、支払い管理は以前の担当者にご確認ください。",
            );
          }
          // 解約済み契約の担当者を切り替える際、旧担当者の未完了Checkoutを新担当者へ引き継がない。
          await tx.settlementCheckoutReservation.updateMany({
            where: { teamId, activeKey: `settlement-team:${teamId}` },
            data: { status: "failed", activeKey: null },
          });
          subscription = await tx.teamSettlementSubscription.update({
            where: { id: subscription.id },
            data: {
              billingAdminId: adminId,
              billingOwnerSupabaseUid: team.admin.supabaseUid,
              billingOwnerEmail: team.admin.email,
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              stripeSubscriptionStatus: null,
              stripePriceId: null,
              stripeProductId: null,
              subscriptionStartedAt: null,
              lastStripeEventCreatedAt: null,
            },
          });
        }
        const activeKey = `settlement-team:${teamId}`;
        const existing = await tx.settlementCheckoutReservation.findUnique({ where: { activeKey } });
        if (existing && (!existing.expiresAt || existing.expiresAt.getTime() > now.getTime())) {
          return { team, subscription, reservation: existing };
        }
        if (existing) {
          await tx.settlementCheckoutReservation.update({
            where: { id: existing.id },
            data: { status: "expired", activeKey: null },
          });
        }
        const reservation = await tx.settlementCheckoutReservation.create({
          data: {
            operationKey: randomUUID(),
            activeKey,
            teamId,
            billingAdminId: adminId,
            billingOwnerSupabaseUid: team.admin.supabaseUid,
            returnPath,
            // Stripe Checkoutの既定有効期間に合わせ、応答断でも同じ冪等キーを再利用する。
            expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
        });
        return { team, subscription, reservation };
      }, { maxWait: 3000, timeout: 10000 });

      const { team } = reservationContext;
      let reservation = reservationContext.reservation;
      let subscription = reservationContext.subscription;
      let customerId = subscription.stripeCustomerId;
      if (customerId) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (
            customer.deleted ||
            customer.metadata.billingPurpose !== SETTLEMENT_BILLING_PURPOSE ||
            customer.metadata.settlementTeamId !== String(teamId) ||
            customer.metadata.billingOwnerSupabaseUid !== team.admin.supabaseUid
          ) customerId = null;
        } catch (error) {
          if ((error as { code?: string }).code !== "resource_missing") throw error;
          customerId = null;
        }
      }
      if (!customerId) {
        if (subscription.stripeSubscriptionId && !isSettlementSubscriptionTerminal(subscription.stripeSubscriptionStatus)) {
          throw new SettlementBillingError("SETTLEMENT_BILLING_INVALID", "精算契約の顧客情報を確認できません");
        }
        const customer = await stripe.customers.create({
          email: team.admin.email,
          metadata: checkoutMetadata(teamId, adminId, team.admin.supabaseUid, priceId, productId),
        }, { idempotencyKey: `settlement-customer-${reservation.operationKey}` });
        customerId = customer.id;
        subscription = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "TeamSettlementSubscription" WHERE "teamId" = ${teamId} FOR UPDATE`;
          const current = await tx.teamSettlementSubscription.findUniqueOrThrow({ where: { teamId } });
          if (current.billingOwnerSupabaseUid !== team.admin.supabaseUid) {
            throw new SettlementBillingError("SETTLEMENT_BILLING_OWNER_CHANGED", "精算プランの担当者が変更されました");
          }
          return tx.teamSettlementSubscription.update({
            where: { id: current.id },
            data: { stripeCustomerId: customerId },
          });
        }, { maxWait: 3000, timeout: 10000 });
      }

      const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
      if (subscriptions.has_more) throw new Error("Too many settlement subscriptions");
      const ongoing = subscriptions.data.find((item) => !isSettlementSubscriptionTerminal(item.status));
      if (ongoing) {
        const synced = await syncSettlementSubscription(ongoing.id, { expectedTeamId: teamId });
        if (!synced) throw new SettlementBillingError("SETTLEMENT_BILLING_INVALID", "精算契約を確認できません");
        await prisma.settlementCheckoutReservation.updateMany({
          where: { id: reservation.id },
          data: { status: "complete", activeKey: null },
        });
        const portal = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: billingReturnUrl(request, returnPath, "settlement_portal=return"),
        });
        return NextResponse.json({ status: "OK", url: portal.url, destination: "portal", active: synced.active });
      }

      if (reservation.stripeCheckoutSessionId) {
        const existing = await stripe.checkout.sessions.retrieve(reservation.stripeCheckoutSessionId);
        const belongsToCurrentOwner =
          stripeId(existing.customer) === customerId &&
          existing.metadata?.billingPurpose === SETTLEMENT_BILLING_PURPOSE &&
          existing.metadata?.settlementTeamId === String(teamId) &&
          existing.metadata?.billingOwnerSupabaseUid === team.admin.supabaseUid;
        if (!belongsToCurrentOwner) {
          throw new SettlementBillingError("SETTLEMENT_BILLING_INVALID", "精算プランの申込情報が一致しません");
        }
        if (existing.status === "open" && existing.url) {
          return NextResponse.json({ status: "OK", url: existing.url, destination: "checkout" });
        }
        reservation = await replaceExpiredReservation({
          teamId,
          adminId,
          ownerUid: team.admin.supabaseUid,
          returnPath,
          reservationId: reservation.id,
        });
      }

      const metadata = checkoutMetadata(teamId, adminId, team.admin.supabaseUid, priceId, productId);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: billingReturnUrl(
          request,
          reservation.returnPath,
          "settlement_checkout=success&settlement_session_id={CHECKOUT_SESSION_ID}",
        ),
        cancel_url: billingReturnUrl(request, reservation.returnPath, "settlement_checkout=cancel"),
        client_reference_id: String(teamId),
        metadata,
        subscription_data: { metadata },
      }, { idempotencyKey: `settlement-checkout-${reservation.operationKey}` });
      if (!session.url) throw new Error("Settlement Checkout URL is missing");
      const saved = await prisma.settlementCheckoutReservation.updateMany({
        where: {
          id: reservation.id,
          activeKey: `settlement-team:${teamId}`,
          billingOwnerSupabaseUid: team.admin.supabaseUid,
        },
        data: {
          stripeCheckoutSessionId: session.id,
          status: "open",
          expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : reservation.expiresAt,
        },
      });
      if (saved.count !== 1) {
        await stripe.checkout.sessions.expire(session.id);
        throw new SettlementBillingError("SETTLEMENT_BILLING_OWNER_CHANGED", "精算プランの申込状態が変更されました");
      }
      return NextResponse.json({ status: "OK", url: session.url, destination: "checkout" });
    } catch (error) {
      const response = billingErrorResponse(error);
      if (response) return response;
      console.error("Settlement Stripe Checkout error:", error);
      return NextResponse.json({ message: "精算プランの決済ページを開けませんでした。" }, { status: 500 });
    }
  }, { params: { teamId: ctx.params.teamId } });

export const GET = (request: NextRequest, ctx: Context) =>
  withAuthTeam(request, async ({ adminId, teamId }) => {
    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      return NextResponse.json({ message: "決済情報が正しくありません" }, { status: 400 });
    }
    try {
      const local = await prisma.teamSettlementSubscription.findUnique({
        where: { teamId },
        include: { team: { select: { admin: { select: { supabaseUid: true } } } } },
      });
      if (!local || local.billingAdminId !== adminId || local.billingOwnerSupabaseUid !== local.team.admin.supabaseUid) {
        throw new SettlementBillingError("SETTLEMENT_BILLING_OWNER_CHANGED", "この決済は現在の担当者のものではありません");
      }
      const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
      if (
        stripeId(session.customer) !== local.stripeCustomerId ||
        session.client_reference_id !== String(teamId) ||
        session.mode !== "subscription" ||
        session.metadata?.billingPurpose !== SETTLEMENT_BILLING_PURPOSE ||
        session.metadata?.settlementTeamId !== String(teamId) ||
        session.metadata?.billingOwnerSupabaseUid !== local.billingOwnerSupabaseUid
      ) {
        return NextResponse.json({ message: "決済情報が見つかりません" }, { status: 404 });
      }
      const subscriptionId = stripeId(session.subscription);
      const synced = session.status === "complete" && subscriptionId
        ? await syncSettlementSubscription(subscriptionId, { expectedTeamId: teamId, checkoutSessionId: session.id })
        : null;
      if (synced) await recordSettlementCheckoutConversion(session, synced);
      const active = Boolean(synced?.active);
      const state = active ? "active" : session.status === "expired" ? "expired" : "pending";
      return NextResponse.json({
        status: "OK",
        state,
        active,
        checkoutStatus: session.status,
        paymentStatus: session.payment_status,
        subscriptionStatus: synced?.subscription.status ?? local.stripeSubscriptionStatus,
      });
    } catch (error) {
      const response = billingErrorResponse(error);
      if (response) return response;
      if ((error as { code?: string }).code === "resource_missing") {
        return NextResponse.json({ message: "決済情報が見つかりません" }, { status: 404 });
      }
      console.error("Settlement Checkout verification error:", error);
      return NextResponse.json({ message: "精算プランの決済状態を確認できませんでした。" }, { status: 500 });
    }
  }, { params: { teamId: ctx.params.teamId } });
