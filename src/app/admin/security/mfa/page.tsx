"use client";

import { FormButton } from "@/app/_components/FormButton";
import { FormInput } from "@/app/_components/FormInput";
import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { useRouteGuard } from "@/app/admin/_hooks/useRouteGuard";
import { shouldRequireAdminMfa } from "@/utils/adminMfa";
import { supabase } from "@/utils/supabase";
import { ArrowLeft, KeyRound, LogOut, QrCode, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type Mode = "loading" | "enroll" | "verify";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

function getQrCodeSrc(qrCode: string) {
  if (qrCode.startsWith("data:")) return qrCode;
  return `data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`;
}

export default function AdminMfaPage() {
  useRouteGuard({ skipMfa: true });

  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSupabaseSession();
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = searchParams.get("next")?.startsWith("/admin")
    ? searchParams.get("next")!
    : "/admin/teams";

  const loadMfaStatus = useCallback(async () => {
    if (!session) return;

    if (!shouldRequireAdminMfa(session.user.email)) {
      router.replace(nextPath);
      return;
    }

    const { data: factors, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) {
      setErrorMessage("MFA設定の確認に失敗しました。再読み込みしてください。");
      setMode("verify");
      return;
    }

    const verifiedFactor = factors.totp[0];
    if (!verifiedFactor) {
      setMode("enroll");
      return;
    }

    setFactorId(verifiedFactor.id);

    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (!assuranceError && assurance?.currentLevel === "aal2") {
      router.replace(nextPath);
      return;
    }

    setMode("verify");
  }, [nextPath, router, session]);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      router.replace("/login");
      return;
    }

    loadMfaStatus();
  }, [loadMfaStatus, router, session]);

  const handleStartEnrollment = async () => {
    setErrorMessage("");
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Carpool 管理者",
      issuer: "Carpool",
    });

    setIsSubmitting(false);

    if (error || !data) {
      setErrorMessage(
        "MFAの設定開始に失敗しました。Supabase AuthでTOTP MFAが有効か確認してください。",
      );
      return;
    }

    setFactorId(data.id);
    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setErrorMessage("認証アプリに表示されている6桁のコードを入力してください。");
      return;
    }

    if (!factorId) {
      setErrorMessage("MFA要素が見つかりません。再読み込みしてください。");
      return;
    }

    setIsSubmitting(true);

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError || !challenge) {
      setIsSubmitting(false);
      setErrorMessage("認証コードの確認を開始できませんでした。");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: trimmedCode,
    });

    setIsSubmitting(false);

    if (verifyError) {
      setErrorMessage("認証コードが正しくありません。もう一度お試しください。");
      return;
    }

    toast.success("二要素認証を確認しました。");
    router.replace(nextPath);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (mode === "loading") {
    return <LoadingSpinner />;
  }

  return (
    <div className="app-page flex min-h-dvh items-start justify-center px-4 py-8 md:py-14">
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
        >
          <ArrowLeft size={16} />
          ホームに戻る
        </Link>

        <section className="app-card overflow-hidden p-5 sm:p-7 md:p-9">
          <div className="mb-7 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 shadow-sm">
              <ShieldCheck size={28} />
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-teal-700">Security</p>
              <h1 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
                二要素認証
              </h1>
              <p className="mt-2 leading-7 text-gray-600">
                管理画面を安全に使うため、認証アプリの6桁コードで本人確認します。
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {errorMessage}
            </div>
          )}

          {mode === "enroll" && (
            <div className="space-y-6">
              {!enrollment ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
                  <div className="mb-2 flex items-center gap-2 font-bold">
                    <QrCode size={20} />
                    認証アプリを設定します
                  </div>
                  <p className="text-sm leading-6">
                    Google Authenticator、1Password、iCloudパスワードなどの認証アプリを利用できます。
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                  <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <Image
                      src={getQrCodeSrc(enrollment.qrCode)}
                      alt="二要素認証設定用QRコード"
                      width={190}
                      height={190}
                      unoptimized
                      className="mx-auto aspect-square w-full max-w-[190px]"
                    />
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-sm font-bold text-gray-700">
                      QRコードを読み取れない場合
                    </p>
                    <code className="block break-all rounded-md bg-white px-3 py-2 text-sm text-gray-700">
                      {enrollment.secret}
                    </code>
                  </div>
                </div>
              )}

              {!enrollment ? (
                <FormButton
                  type="button"
                  label="認証アプリを設定する"
                  loadingLabel="設定中..."
                  isSubmitting={isSubmitting}
                  onClick={handleStartEnrollment}
                  className="w-full"
                />
              ) : (
                <form onSubmit={handleVerify} className="space-y-5">
                  <FormInput
                    label="認証コード"
                    icon={<KeyRound size={18} />}
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                  <FormButton
                    label="認証して管理画面へ進む"
                    loadingLabel="確認中..."
                    isSubmitting={isSubmitting}
                    className="w-full"
                  />
                </form>
              )}
            </div>
          )}

          {mode === "verify" && (
            <form onSubmit={handleVerify} className="space-y-5">
              <FormInput
                label="認証コード"
                icon={<KeyRound size={18} />}
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <FormButton
                label="認証して管理画面へ進む"
                loadingLabel="確認中..."
                isSubmitting={isSubmitting}
                className="w-full"
              />
            </form>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-800"
          >
            <LogOut size={16} />
            ログアウトしてやり直す
          </button>
        </section>
      </div>
    </div>
  );
}
