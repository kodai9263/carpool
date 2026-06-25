"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { BillingStatusResponse } from "@/app/_types/response/billingResponse";
import { TeamsListResponse } from "@/app/_types/response/teamResponse";
import { FREE_TEAM_LIMIT, PRO_ADDITIONAL_TEAM_PRICE_JPY } from "@/utils/billing";
import { trackEvent } from "@/utils/analytics";
import { Users, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import TeamForm from "../_components/TeamForm";

export default function Page() {
  const router = useRouter();
  const { data: teamsData, isLoading: isTeamsLoading } = useFetch<TeamsListResponse>(
    "/api/admin/teams?page=1&perPage=1",
  );
  const { data: billingData, isLoading: isBillingLoading } = useFetch<BillingStatusResponse>(
    "/api/admin/billing/status",
  );

  if (isTeamsLoading || isBillingLoading || !teamsData || !billingData) {
    return <LoadingSpinner />;
  }

  const shouldBlockTeamCreation =
    teamsData.total >= FREE_TEAM_LIMIT && !billingData.billing.isPro;

  if (shouldBlockTeamCreation) {
    return (
      <div className="app-page">
        <div className="app-container max-w-xl">
          <div className="app-card border-amber-200 bg-amber-50/80 p-6 md:p-8">
            <div className="mb-5 flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
                <WalletCards size={22} />
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-700">Proプラン</p>
                <h1 className="mt-1 text-xl font-bold text-amber-950">
                  Freeでは1チームまで作成できます
                </h1>
                <p className="mt-3 text-sm leading-6 text-amber-900">
                  複数チームの管理と自動割り当て無制限は、Proプラン（月額
                  {PRO_ADDITIONAL_TEAM_PRICE_JPY.toLocaleString("ja-JP")}円）で利用できます。
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/admin/teams")}
                className="app-button-secondary flex-1 border-amber-200 bg-white text-amber-900 hover:bg-amber-100"
              >
                チーム一覧に戻る
              </button>
              <button
                type="button"
                onClick={() => {
                  trackEvent("upgrade_clicked", { source: "team_new_direct_limit" });
                  router.push("/admin/profile#plan");
                }}
                className="app-button-primary flex-1"
              >
                プランを見る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page">
      <div className="app-container max-w-xl">
        <div className="mb-6">
          <p className="mb-1 text-sm font-semibold text-teal-700">新規チーム</p>
          <h1 className="app-section-title flex items-center gap-2">
            <Users size={26} className="text-teal-700" />
            チーム作成
          </h1>
        </div>
        <div className="app-card p-6 md:p-8">
        <TeamForm />
        </div>
      </div>
    </div>
  );
}
