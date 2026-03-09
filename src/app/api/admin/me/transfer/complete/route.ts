import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: 新担当者による引き継ぎ完了
export const POST = async (request: NextRequest) => {
  // 新担当者のトークンを検証（withAuth は旧担当者用なので直接検証）
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "認証が必要です" }, { status: 401 });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ message: "無効なトークンです" }, { status: 401 });
  }

  const newSupabaseUid = user.id;
  const newEmail = user.email;
  if (!newEmail) {
    return NextResponse.json({ message: "メールアドレスが取得できません" }, { status: 400 });
  }

  // pendingTransferNewSupabaseUid が新担当者の UID に一致する Admin を検索
  const admin = await prisma.admin.findFirst({
    where: { pendingTransferNewSupabaseUid: newSupabaseUid },
    select: { id: true, supabaseUid: true },
  });

  if (!admin) {
    return NextResponse.json({ message: "引き継ぎ対象の管理者が見つかりません" }, { status: 404 });
  }

  const oldSupabaseUid = admin.supabaseUid;

  // Admin レコードを新担当者のものに更新
  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      supabaseUid: newSupabaseUid,
      email: newEmail,
      pendingTransferNewEmail: null,
      pendingTransferNewSupabaseUid: null,
    },
  });

  // 旧 Supabase ユーザーを削除（失敗してもエラーにしない）
  await supabaseAdmin.auth.admin.deleteUser(oldSupabaseUid);

  return NextResponse.json({ status: "OK", message: "引き継ぎが完了しました" });
};
