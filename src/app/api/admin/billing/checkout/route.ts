import { prisma } from "@/lib/prisma";
import { getStripeClient, getValidatedStripeProPriceId } from "@/lib/stripe";
import { billingReturnUrl, billingSource, resolveBillingReturnPath, stripeId } from "@/utils/billingCheckout";
import { recordCheckoutConversion, syncBillingSubscription } from "@/utils/billingSubscription";
import { trackServerEvent } from "@/utils/serverAnalytics";
import { withAuth } from "@/utils/withAuth";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";

export const POST = (request: NextRequest) => withAuth(request, async (adminId) => {
  try {
    const body = await request.json().catch(() => null);
    const interval = body?.interval === "year" ? "year" : "month";
    const source = billingSource(body?.source);
    const returnPath = await resolveBillingReturnPath(adminId, body?.returnPath);
    const stripe = getStripeClient();
    // 設定と料金の検証は外部顧客作成やDBロックより先に行う。
    const priceId = await getValidatedStripeProPriceId(interval);
    // 同一管理者の二重クリック・別タブを直列化する。Stripe側も冪等キーで保護する。
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Admin" WHERE "id" = ${adminId} FOR UPDATE`;
      const admin = await tx.admin.findUniqueOrThrow({ where: { id: adminId } });
      let customerId = admin.stripeCustomerId;
      if (customerId) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer.deleted) customerId = null;
        } catch (error) {
          if ((error as { code?: string }).code !== "resource_missing") throw error;
          customerId = null;
        }
      }
      if (!customerId) {
        const customer = await stripe.customers.create({ email: admin.email, metadata: { adminId: String(adminId) } }, {
          idempotencyKey: `billing-customer-${adminId}-${admin.stripeCustomerId ?? "new"}`,
        });
        customerId = customer.id;
        await tx.admin.update({ where: { id: adminId }, data: { stripeCustomerId: customerId } });
      }
      const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
      if (subscriptions.has_more) throw new Error("Too many subscriptions to safely start Checkout");
      if (subscriptions.data.some((item) => !["canceled", "incomplete_expired"].includes(item.status))) {
        const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: billingReturnUrl(request, returnPath, "portal=return") });
        return { url: portal.url, destination: "portal" as const, created: false };
      }
      if (admin.billingPlan === "pro") throw new Error("Pro entitlement already exists");
      const sessions = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 });
      if (sessions.has_more) throw new Error("Too many open sessions to safely start Checkout");
      const existing = sessions.data.find((session) => session.mode === "subscription");
      if (existing) {
        if (existing.metadata?.interval === interval && existing.metadata?.returnPath === returnPath && existing.url) {
          for (const duplicate of sessions.data.filter((item) => item.mode === "subscription" && item.id !== existing.id)) {
            await stripe.checkout.sessions.expire(duplicate.id);
          }
          return { url: existing.url, destination: "checkout" as const, created: false };
        }
        // 旧画面で開いた未決済セッションを残さず、新しい選択へ置き換える。
        for (const session of sessions.data.filter((item) => item.mode === "subscription")) {
          await stripe.checkout.sessions.expire(session.id);
        }
      }
      const latest = await stripe.checkout.sessions.list({ customer: customerId, limit: 1 });
      // 最初の契約一覧取得後に、別タブのCheckoutが成立した場合も新規契約を作らない。
      const latestSubscriptionId = latest.data[0]?.status === "complete" ? stripeId(latest.data[0].subscription) : undefined;
      if (latestSubscriptionId) {
        const latestSubscription = await stripe.subscriptions.retrieve(latestSubscriptionId);
        if (!["canceled", "incomplete_expired"].includes(latestSubscription.status)) {
          const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: billingReturnUrl(request, returnPath, "portal=return") });
          return { url: portal.url, destination: "portal" as const, created: false };
        }
      }
      const successUrl = billingReturnUrl(request, returnPath, "checkout=success&session_id={CHECKOUT_SESSION_ID}");
      const cancelUrl = billingReturnUrl(request, returnPath, "checkout=cancel");
      const idempotencyKey = createHash("sha256").update(JSON.stringify([adminId, customerId, priceId, successUrl, source, latest.data[0]?.id ?? "first"])).digest("hex");
      const session = await stripe.checkout.sessions.create({
        mode: "subscription", customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl, cancel_url: cancelUrl,
        client_reference_id: String(adminId),
        metadata: { adminId: String(adminId), interval, source, returnPath, conversionVersion: "1" },
        subscription_data: { metadata: { adminId: String(adminId) } },
      }, { idempotencyKey: `billing-checkout-${idempotencyKey}` });
      if (!session.url) throw new Error("Checkout URL is missing");
      return { url: session.url, destination: "checkout" as const, created: true };
    }, { maxWait: 3000, timeout: 20000 });
    if (result.created) await trackServerEvent("checkout_started", { source, interval, plan: "pro" }, { adminId, request });
    return NextResponse.json({ status: "OK", url: result.url, destination: result.destination });
  } catch (error) {
    console.error("Stripe Checkout error:", error);
    if ((error as { code?: string }).code === "BILLING_UNAVAILABLE") {
      return NextResponse.json({ message: "現在、決済を利用できません。時間をおいて再度お試しください。" }, { status: 503 });
    }
    return NextResponse.json({ message: "決済ページを開けませんでした。少し待って再度お試しください。" }, { status: 500 });
  }
});

export const GET = (request: NextRequest) => withAuth(request, async (adminId) => {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return NextResponse.json({ message: "決済情報が正しくありません" }, { status: 400 });
  try {
    const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { stripeCustomerId: true } });
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    if (!admin?.stripeCustomerId || stripeId(session.customer) !== admin.stripeCustomerId ||
      session.client_reference_id !== String(adminId) || session.mode !== "subscription") {
      return NextResponse.json({ message: "決済情報が見つかりません" }, { status: 404 });
    }
    const subscriptionId = stripeId(session.subscription);
    const synced = session.status === "complete" && subscriptionId ? await syncBillingSubscription(subscriptionId, adminId) : null;
    const isPro = Boolean(synced && ["active", "trialing"].includes(synced.subscription.status));
    if (synced) await recordCheckoutConversion(session, adminId, synced.subscription);
    const state = isPro ? "active" : session.status === "expired" ? "expired" :
      synced && ["past_due", "unpaid", "canceled", "incomplete_expired", "paused"].includes(synced.subscription.status) ? "unpaid" : "pending";
    return NextResponse.json({ status: "OK", state, isPro, checkoutStatus: session.status, paymentStatus: session.payment_status, subscriptionStatus: synced?.subscription.status ?? null });
  } catch (error) {
    if ((error as { code?: string }).code === "resource_missing") return NextResponse.json({ message: "決済情報が見つかりません" }, { status: 404 });
    console.error("Checkout verification error:", error);
    return NextResponse.json({ message: "決済状態を確認できませんでした。再度お試しください。" }, { status: 500 });
  }
});
