import { prisma } from "@/lib/prisma";
import { notifyFeedback } from "@/lib/feedbackNotification";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_CATEGORIES = ["改善要望", "バグ報告", "使ってみたい機能", "その他"] as const;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const POST = async (request: NextRequest) => {
  const body = await request.json().catch(() => null) as {
    category?: string;
    message?: string;
    replyEmail?: string;
  } | null;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "リクエストが不正です" }, { status: 400 });
  }

  const { category, message, replyEmail } = body;

  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    return NextResponse.json({ message: "カテゴリが不正です" }, { status: 400 });
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ message: "メッセージは必須です" }, { status: 400 });
  }

  if (message.trim().length > 1000) {
    return NextResponse.json({ message: "メッセージは1000文字以内で入力してください" }, { status: 400 });
  }

  if (replyEmail != null && typeof replyEmail !== "string") {
    return NextResponse.json({ message: "返信先メールアドレスが不正です" }, { status: 400 });
  }
  const normalizedReplyEmail = replyEmail?.trim() || null;
  if (normalizedReplyEmail && (
    normalizedReplyEmail.length > 254 ||
    !/^[^\s@<>(),;:\\"\[\]]+@[^\s@<>(),;:\\"\[\]]+\.[^\s@<>(),;:\\"\[\]]+$/.test(normalizedReplyEmail)
  )) {
    return NextResponse.json({ message: "返信先メールアドレスが不正です" }, { status: 400 });
  }

  // Bearerトークンがあればadminを特定する
  let adminId: number | null = null;
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user) {
      const admin = await prisma.admin.findUnique({ where: { supabaseUid: user.id } });
      if (admin) adminId = admin.id;
    }
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        category,
        message: message.trim(),
        replyEmail: normalizedReplyEmail,
        adminId,
      },
    });
    try {
      // サーバーレス環境で送信が中断されないよう、完了を待って応答する。
      await notifyFeedback(feedback);
    } catch (error) {
      // 保存済みの投稿は受け付ける。本文や認証情報はログに残さない。
      const details = error && typeof error === "object" ? error as { code?: unknown; responseCode?: unknown } : {};
      const code = typeof details.code === "string" &&
        ["EAUTH", "ECONNECTION", "ETIMEDOUT", "EDNS", "ESOCKET", "ETLS", "EENVELOPE", "EMESSAGE", "EMISSINGCONFIG"].includes(details.code)
        ? details.code : "UNKNOWN";
      const responseCode = typeof details.responseCode === "number" && Number.isInteger(details.responseCode) &&
        details.responseCode >= 400 && details.responseCode <= 599 ? details.responseCode : undefined;
      console.error("[feedback-notification] delivery_failed", { feedbackId: feedback.id, code, responseCode });
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
};
