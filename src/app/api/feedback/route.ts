import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

  if (!body) {
    return NextResponse.json({ message: "リクエストが不正です" }, { status: 400 });
  }

  const { category, message, replyEmail } = body;

  if (!category || !VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    return NextResponse.json({ message: "カテゴリが不正です" }, { status: 400 });
  }

  if (!message || message.trim().length === 0) {
    return NextResponse.json({ message: "メッセージは必須です" }, { status: 400 });
  }

  if (message.trim().length > 1000) {
    return NextResponse.json({ message: "メッセージは1000文字以内で入力してください" }, { status: 400 });
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
    await prisma.feedback.create({
      data: {
        category,
        message: message.trim(),
        replyEmail: replyEmail?.trim() || null,
        adminId,
      },
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
};
