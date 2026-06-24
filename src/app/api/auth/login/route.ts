import { prisma } from "@/lib/prisma";
import {
  getClientIp,
  getLockedUntil,
  getLoginLockMinutes,
  getLoginMaxFailures,
  isCurrentlyLocked,
  normalizeLoginEmail,
} from "@/utils/loginSecurity";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

function loginError(status = 401, lockedUntil?: Date | null) {
  return NextResponse.json(
    {
      error:
        status === 429
          ? "ログイン試行回数が上限に達しました。しばらく時間をおいて再度お試しください。"
          : "メールアドレスまたはパスワードを確認してください。",
      lockedUntil: lockedUntil?.toISOString(),
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const { email, password } = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "メールアドレスとパスワードを入力してください。" },
      { status: 400 },
    );
  }

  const normalizedEmail = normalizeLoginEmail(email);
  const ipAddress = getClientIp(request.headers);
  const now = new Date();
  const maxFailures = getLoginMaxFailures();
  const lockMinutes = getLoginLockMinutes();

  const existingAttempt = await prisma.loginAttempt.findUnique({
    where: {
      email_ipAddress: {
        email: normalizedEmail,
        ipAddress,
      },
    },
  });

  if (isCurrentlyLocked(existingAttempt?.lockedUntil, now)) {
    return loginError(429, existingAttempt?.lockedUntil);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.session) {
    const nextFailedCount = (existingAttempt?.failedCount ?? 0) + 1;
    const lockedUntil = getLockedUntil(
      nextFailedCount,
      now,
      maxFailures,
      lockMinutes,
    );

    await prisma.loginAttempt.upsert({
      where: {
        email_ipAddress: {
          email: normalizedEmail,
          ipAddress,
        },
      },
      create: {
        email: normalizedEmail,
        ipAddress,
        failedCount: nextFailedCount,
        lockedUntil,
        lastFailedAt: now,
      },
      update: {
        failedCount: nextFailedCount,
        lockedUntil,
        lastFailedAt: now,
      },
    });

    return loginError(lockedUntil ? 429 : 401, lockedUntil);
  }

  await prisma.loginAttempt.deleteMany({
    where: {
      email: normalizedEmail,
      ipAddress,
    },
  });

  return NextResponse.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
}
