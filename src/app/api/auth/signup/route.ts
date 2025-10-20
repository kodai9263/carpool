import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "emailとpasswordは必須です"}, { status: 400 });
    }

    // サーバーででユーザー作成
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || "ユーザーの作成に失敗しました" }, { status: 400 });
    }

    const user = data.user;
    
    const admin = await prisma.admin.create({
      data: {
        email: user.email ?? email,
        supabaseUid: user.id, // 文字列UUID
      },
      select: { id: true, email: true },
    });

    return NextResponse.json({ success: true, adminId: admin.id }, { status: 201 });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: "サーバー内部でエラーが発生しました" }, { status: 500 });
  }
};