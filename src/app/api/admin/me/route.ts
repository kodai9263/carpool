import { prisma } from "@/lib/prisma";
import { withAuth } from "@/utils/withAuth";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 現在の管理者のメールアドレスを返す
export const GET = (request: NextRequest) => 
  withAuth(request, async (adminId) => {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: { id: true, email: true },
      });
      if (!admin) {
        return NextResponse.json({ message: "管理者が見つかりません"}, { status: 404 });
      }
      return NextResponse.json({ status: "OK", admin }, { status: 200 });
    } catch {
      return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  });

  // DELETE: アカウント削除
  export const DELETE = (request: NextRequest) =>
    withAuth(request, async (adminId) => {
      try {
        const admin = await prisma.admin.findUnique({
          where: { id: adminId },
          select: { supabaseUid: true },
        });
        if (!admin) {
          return NextResponse.json({ message: "管理者が見つかりません" }, { status: 404 });
        }

        // Supabase Authユーザーを先に削除
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
          admin.supabaseUid
        );
        if (authError) {
          return NextResponse.json({ message: "認証ユーザーの削除に失敗しました" }, { status: 500 });
        }

        // Prisma Adminを削除
        await prisma.admin.delete({ where: { id: adminId } });

        return NextResponse.json({ status: "OK", message: "アカウントを削除しました" }, { status: 200 });
      } catch {
        return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
      }
    });