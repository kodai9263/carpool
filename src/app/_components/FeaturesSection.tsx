"use client";

import { useState } from "react";
import { Car, Users, Calendar, Zap, Key, UserCog } from "lucide-react";
import { FeatureModal } from "./FeatureModal";

type Feature = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  image: string;
  detail: string;
};

const features: Feature[] = [
  {
    icon: <Car size={22} className="text-[#5d9b94]" />,
    title: "配車ドライバー管理",
    desc: "誰が何人乗せられるか一覧で確認。子供の割り当てまで直感的に操作できます",
    image: "/features/driver.png",
    detail: "ドライバーごとの空き座席数を一覧で把握できます。子供を選択して各車に割り当てるだけで配車が完成。LINEで何度もやり取りする必要はありません。",
  },
  {
    icon: <Users size={22} className="text-[#5d9b94]" />,
    title: "引率者・自走にも対応",
    desc: "配車だけでなく引率者の管理や、自走で参加する子供の把握もアプリ1つで完結",
    image: "/features/escort.png",
    detail: "車を出せないけど引率はできる保護者や、自転車・徒歩で参加する子供も管理できます。配車・引率・自走をまとめて一画面で確認できます。",
  },
  {
    icon: <Calendar size={22} className="text-[#5d9b94]" />,
    title: "日程ごとに管理",
    desc: "試合・練習ごとに配車を個別管理。行き帰りで別々の配車にも対応しています",
    image: "/features/schedule.png",
    detail: "試合・練習ごとに配車を作成・管理できます。行きと帰りで別々のドライバーを設定することも可能。過去の配車もいつでも振り返れます。",
  },
  {
    icon: <Zap size={22} className="text-[#5d9b94]" />,
    title: "自動アサイン",
    desc: "ボタン1つで子供を各ドライバーへ自動割り当て。手作業の調整時間をゼロに",
    image: "/features/auto-assign.png",
    detail: "「自動アサイン」ボタンを押すだけで、各ドライバーの座席数に合わせて子供を自動で振り分けます。手動での細かい調整も後から自由にできます。",
  },
  {
    icon: <Key size={22} className="text-[#5d9b94]" />,
    title: "PINコードで簡単共有",
    desc: "アカウント登録不要。管理者がPINを共有するだけでメンバー全員がすぐ使えます",
    image: "/features/pin.png",
    detail: "メンバーはアカウント登録不要。管理者がPINコードをLINEで送るだけで全員がすぐ使い始められます。アプリのインストールも不要です。管理者はホーム画面に追加すると便利です。",
  },
  {
    icon: <UserCog size={22} className="text-[#5d9b94]" />,
    title: "出欠も一括管理",
    desc: "子供ごとの参加・欠席もアプリ内で管理。当日の出席確認もスムーズに行えます",
    image: "/features/attendance.png",
    detail: "当日の参加・欠席状況をリアルタイムで把握できます。急な欠席が出ても、その場で配車を調整。「言った・言わない」のトラブルもなくなります。",
  },
];

export function FeaturesSection() {
  const [selected, setSelected] = useState<Feature | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feature, i) => (
          <button
            key={i}
            onClick={() => setSelected(feature)}
            className="group p-6 rounded-2xl border border-gray-100 hover:border-[#5d9b94]/30 hover:shadow-md transition-all duration-200 text-left cursor-pointer"
          >
            <div className="w-11 h-11 bg-[#5d9b94]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#5d9b94]/15 transition-colors">
              {feature.icon}
            </div>
            <h3 className="text-base font-bold mb-2 text-gray-900">{feature.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
            <p className="mt-3 text-xs text-[#5d9b94] font-medium group-hover:underline">
              詳しく見る →
            </p>
          </button>
        ))}
      </div>

      <FeatureModal feature={selected} onClose={() => setSelected(null)} />
    </>
  );
}
