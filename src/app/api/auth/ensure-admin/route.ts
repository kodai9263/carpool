import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Google OAuth後にAdminレコードを作成する（存在しない場合のみ）
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: "無効なトークンです" }, { status: 401 });
  }

  // 既存のAdminレコードがあればスキップ
  const existing = await prisma.admin.findUnique({
    where: { supabaseUid: user.id },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ success: true, adminId: existing.id });
  }

  // 新規Googleユーザーのみ作成
  const admin = await prisma.admin.create({
    data: {
      email: user.email ?? "",
      supabaseUid: user.id,
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true, adminId: admin.id }, { status: 201 });
}
