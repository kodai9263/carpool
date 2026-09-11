'use client';

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useFetch } from "@/app/_hooks/useFetch";
import type { GettingStartedResponse } from "@/app/_types/response/gettingStartedResponse";
import { trackEvent } from "@/utils/analytics";

const steps = ["家族を登録", "日程を作成", "回答を集める", "配車を保存", "結果を連絡"];

export function getGettingStartedAction(teamId: string, data: GettingStartedResponse) {
  const base = `/admin/teams/${teamId}`;
  if (!data.memberCount) return { step: 0, title: "最初の家族を登録しましょう", body: "保護者と乗車する子どもを登録します。まずは1家族から始められます。", label: "家族を登録する", href: `${base}/members/new` };
  if (!data.childCount) return { step: 0, title: "乗車する子どもを登録しましょう", body: "登録した家族を開き、配車する子どもを追加してください。", label: "家族一覧を開く", href: `${base}/members` };
  if (!data.ride) return { step: 1, title: "次の配車日程を作りましょう", body: "日付と行き先を決めると、保護者へ回答を依頼できます。", label: "配車日程を作る", href: `${base}/rides/new` };
  // 一部の割り当てが保存された状態なので、全員分の完成とは扱わない。
  if (data.ride.hasSavedAssignments) return { step: 4, title: "配車を確認して連絡しましょう", body: "乗せ忘れや行き帰りの割り当てを確認し、変更があれば保存してから「配車決定を連絡」で保護者へ案内してください。", label: "配車を確認して連絡する", href: `${base}/rides/${data.ride.id}#share-final` };
  if (!data.ride.driverCount && data.ride.isAnswerLocked) return { step: 2, title: "回答期限を見直しましょう", body: "回答がロックされています。配車画面で期限を延ばすかロックを解除してから、保護者へ回答を依頼してください。", label: "回答期限を確認する", href: `${base}/rides/${data.ride.id}#answer-deadline` };
  if (!data.ride.driverCount) return { step: 2, title: "保護者に回答を依頼しましょう", body: "配車画面の「回答を依頼」から、LINEやコピーで保護者へ案内できます。", label: "回答依頼へ進む", href: `${base}/rides/${data.ride.id}#share-request` };
  return { step: 3, title: "配車を割り当てて保存しましょう", body: "車を出せる保護者の回答が届いています。ドライバーと乗せる人を選び、内容を確認したら「変更を更新」で保存してください。", label: "配車を割り当てる", href: `${base}/rides/${data.ride.id}#manual-assign` };
}

export function GettingStartedContent({ teamId, data }: { teamId: string; data: GettingStartedResponse }) {
  const action = getGettingStartedAction(teamId, data);
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;
    const key = `${teamId}:${action.step}`;
    if (seen.current.has(key)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      seen.current.add(key);
      trackEvent("getting_started_viewed", { team_id: teamId, step: action.step });
      observer.disconnect();
    }, { threshold: 0.25 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [teamId, action.step]);

  return (
    <section ref={ref} aria-label="次の配車の準備" className="mb-6 rounded-2xl border border-teal-200 bg-teal-50/70 p-5 sm:p-6">
      <p className="text-sm font-semibold text-teal-700">次の配車の準備</p>
      <ol className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="配車を保存して連絡するまでの手順">
        {steps.map((label, index) => (
          <li key={label} aria-current={index === action.step ? "step" : undefined} className={`flex items-center gap-2 text-xs ${index === action.step ? "font-bold text-teal-950" : "text-gray-600"}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${index <= action.step ? "bg-teal-700 text-white" : "bg-white text-gray-500"}`}>
              {index + 1}
            </span>{label}
          </li>
        ))}
      </ol>
      <h2 className="text-lg font-bold text-gray-950">{action.title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-700">{action.body}</p>
      {data.ride && action.step >= 2 && <p className="mt-2 break-words text-xs text-gray-600">対象：{new Date(data.ride.date).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" })} · {data.ride.destination}</p>}
      <Link href={action.href} className="app-button-primary mt-4 flex w-full items-center justify-center gap-2 sm:w-fit" onClick={() => trackEvent("getting_started_clicked", { team_id: teamId, step: action.step })}>
        {action.label}<ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}

export default function GettingStartedCard({ teamId, afterRegistration = false, familyRegistrationOnly = false }: { teamId: string; afterRegistration?: boolean; familyRegistrationOnly?: boolean }) {
  const { data, error, mutate } = useFetch<GettingStartedResponse>(`/api/admin/teams/${teamId}/getting-started`);
  useEffect(() => {
    // 別タブで届いた回答も、戻ったときに案内へ反映する。
    const refresh = () => { void mutate(); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [mutate]);
  if (error) return <div className="mb-6 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">利用状況を読み込めませんでした。<button type="button" className="app-button-secondary mt-2 flex items-center gap-2" onClick={() => void mutate()}><RefreshCw size={14} />再読み込み</button></div>;
  if (!data) return <p role="status" className="mb-6 text-sm text-gray-500">次の手順を確認しています…</p>;
  if (afterRegistration && (!data.memberCount || !data.childCount)) return null;
  if (familyRegistrationOnly && data.memberCount > 0 && data.childCount > 0) {
    return <p className="mb-5 text-sm text-gray-600">登録済みの家族を変更する場合は、<Link href={`/admin/teams/${teamId}/members`} className="font-semibold text-teal-700 underline underline-offset-4">家族を追加・確認</Link>から進めます。</p>;
  }
  return <GettingStartedContent teamId={teamId} data={data} />;
}
