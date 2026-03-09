import { prisma } from "@/lib/prisma";
import { withAuth } from "@/utils/withAuth";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DELETE: 引き継ぎキャンセル（pending 新ユーザーを削除してクリア）
export const DELETE = (request: NextRequest) =>
  withAuth(request, async (adminId) => {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { pendingTransferNewSupabaseUid: true },
    });

    if (!admin?.pendingTransferNewSupabaseUid) {
      return NextResponse.json(
        { message: "引き継ぎ中の記録がありません" },
        { status: 400 }
      );
    }

    // 1. pending 新 Supabase ユーザーを削除
    const { error } = await supabaseAdmin.auth.admin.deleteUser(admin.pendingTransferNewSupabaseUid);
    if (error) {
      return NextResponse.json(
        { message: "招待ユーザーの削除に失敗しました" },
        { status: 500 }
      );
    }

    // 2. Prisma の pending フィールドをクリア
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        pendingTransferNewEmail: null,
        pendingTransferNewSupabaseUid: null,
      },
    });

    return NextResponse.json({ status: "OK", message: "引き継ぎをキャンセルしました" });
  });
