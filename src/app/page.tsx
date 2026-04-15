import Image from "next/image";
import { Car, Users, Calendar, Check, ChevronRight, UserCog, ArrowDown, Key, Zap } from "lucide-react";
import { Footer } from "./_components/Footer";
import { LpTracker, TrackedLink } from "./_components/LpTracker";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const teamCount = await prisma.team.count();

  return (
    <div className="min-h-screen bg-white">
      <LpTracker />

      {/* ヒーローセクション */}
      <section id="section-hero" className="relative flex flex-col items-center justify-center min-h-screen text-center px-4 pb-16 md:pb-20 overflow-hidden">
        {/* 背景グラデーション */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#f0f9f8] via-white to-white pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-[#5d9b94]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-40 right-1/4 w-56 h-56 bg-[#5d9b94]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <p className="text-sm md:text-base mb-6 text-[#5d9b94] font-semibold tracking-widest uppercase">
            少年野球・サッカーの配車を、もっとかんたんに
          </p>
          <h1 className="text-7xl md:text-8xl font-bold mb-5 text-gray-900 tracking-tight">Carpool</h1>
          <p className="text-xl md:text-2xl text-gray-500 mb-10 font-normal max-w-sm leading-relaxed">
            ExcelやLINEのやり取りは<br />もう終わり
          </p>

          <div className="flex justify-center items-center gap-8 mb-10">
            <Image src="/bat.png" alt="bat" width={100} height={100} />
            <Image src="/car.png" alt="car" width={130} height={100} />
          </div>

          {/* チーム数バッジ */}
          <div className="flex items-center justify-center mb-8">
            <span className="inline-flex items-center gap-2 bg-white border border-green-200 text-green-700 px-4 py-2 rounded-full font-medium shadow-sm text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />
              すでに <strong className="text-green-800 mx-0.5">{teamCount}</strong> チームが利用中
            </span>
          </div>

          {/* CTAボタン群 */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <TrackedLink
              href="/signup"
              trackLabel="signup_hero"
              className="inline-flex items-center justify-center h-14 px-10 rounded-2xl bg-[#5d9b94] hover:bg-[#4a8880] text-white font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform"
            >
              無料で始める
            </TrackedLink>
            <TrackedLink
              href="/login?guest=true"
              trackLabel="demo_hero"
              className="inline-flex items-center justify-center h-14 px-8 rounded-2xl border-2 border-gray-200 hover:border-gray-300 text-gray-600 font-medium transition-all hover:bg-gray-50"
            >
              デモを試す →
            </TrackedLink>
          </div>
          <TrackedLink
            href="/login"
            trackLabel="login_hero"
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            すでにアカウントをお持ちの方はログイン
          </TrackedLink>
        </div>

        <div className="absolute bottom-8 md:bottom-6 animate-bounce z-10">
          <ArrowDown size={24} className="text-gray-300" />
        </div>
      </section>

      {/* こんなお悩みありませんか？ */}
      <section id="section-problems" className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 text-gray-900">こんなお悩みありませんか？</h2>
          <p className="text-gray-400 text-center mb-14 text-base">配車担当者なら誰もが経験する、あの煩わしさ</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {[
              "LINEで誰が乗せるか毎回確認してる",
              "Excelの更新履歴が追えない",
              "急な欠席で配車の調整が大変",
              "「言った・言わない」のトラブルが心配",
            ].map((problem, i) => (
              <div key={i} className="flex items-center gap-4 bg-white p-5 rounded-xl border border-red-100 shadow-sm">
                <div className="flex-shrink-0 w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3L11 11M11 3L3 11" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-gray-700 text-base font-medium">{problem}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#5d9b94] rounded-2xl px-8 py-6 text-center shadow-lg">
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Check size={22} className="text-white" />
              </div>
              <p className="text-2xl font-bold text-white">Carpoolなら全部解決！</p>
              <ChevronRight size={28} className="text-white/70 flex-shrink-0" />
            </div>
          </div>
        </div>
      </section>

      {/* アプリの特徴 */}
      <section id="section-features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 text-gray-900">Carpoolの特徴</h2>
          <p className="text-gray-400 text-center mb-16 text-base">チームの送迎を、ひとつのアプリで完結</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Car size={22} className="text-[#5d9b94]" />, title: "配車ドライバー管理", desc: "誰が何人乗せられるか一覧で確認。子供の割り当てまで直感的に操作できます" },
              { icon: <Users size={22} className="text-[#5d9b94]" />, title: "引率者・自走にも対応", desc: "配車だけでなく引率者の管理や、自走で参加する子供の把握もアプリ1つで完結" },
              { icon: <Calendar size={22} className="text-[#5d9b94]" />, title: "日程ごとに管理", desc: "試合・練習ごとに配車を個別管理。行き帰りで別々の配車にも対応しています" },
              { icon: <Zap size={22} className="text-[#5d9b94]" />, title: "自動アサイン", desc: "ボタン1つで子供を各ドライバーへ自動割り当て。手作業の調整時間をゼロに" },
              { icon: <Key size={22} className="text-[#5d9b94]" />, title: "PINコードで簡単共有", desc: "アカウント登録不要。管理者がPINを共有するだけでメンバー全員がすぐ使えます" },
              { icon: <UserCog size={22} className="text-[#5d9b94]" />, title: "出欠も一括管理", desc: "子供ごとの参加・欠席もアプリ内で管理。当日の出席確認もスムーズに行えます" },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-[#5d9b94]/30 hover:shadow-md transition-all duration-200 cursor-default"
              >
                <div className="w-11 h-11 bg-[#5d9b94]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#5d9b94]/15 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-base font-bold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 使い方セクション */}
      <section id="section-how-to-use" className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 text-gray-900">使い方</h2>
          <p className="text-gray-400 text-center mb-16 text-base">シンプルなステップで、すぐに始められます</p>

          {/* 管理者向け */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5 px-1">
              <div className="w-10 h-10 bg-[#5d9b94] rounded-xl flex items-center justify-center flex-shrink-0">
                <UserCog size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-[#5d9b94] font-semibold tracking-wider uppercase mb-0.5">For Admin</p>
                <h3 className="text-lg font-bold text-gray-900">管理者（コーチ・保護者代表）</h3>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {[
                { n: "1", title: "チームを作成", desc: "会員登録後、チーム名・メンバー・子供の名前を登録します" },
                { n: "2", title: "配車日程を作成・PINを共有", desc: "試合や練習の日付と行き先を登録し、PINコードをLINEでメンバーに共有します" },
                { n: "3", title: "配車・引率を確定する", desc: "メンバーの回答を確認し、ドライバー・引率者を選択。自動アサインで子供を各車に割り当てます" },
                { n: "4", title: "当日の出欠確認", desc: "出席確認ページで当日の参加状況をリアルタイムに把握できます" },
              ].map((step, i, arr) => (
                <div key={i} className={`flex gap-5 p-6 ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="flex-shrink-0 w-8 h-8 bg-[#5d9b94]/10 text-[#5d9b94] rounded-full flex items-center justify-center font-bold text-sm">
                    {step.n}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* メンバー向け */}
          <div>
            <div className="flex items-center gap-3 mb-5 px-1">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-semibold tracking-wider uppercase mb-0.5">For Member</p>
                <h3 className="text-lg font-bold text-gray-900">メンバー（保護者）</h3>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {[
                { n: "1", title: "PINコードで参加", desc: "アカウント登録不要。管理者から共有されたPINコードを入力するだけでアクセスできます" },
                { n: "2", title: "配車・引率・自走を回答", desc: "送迎できるか・引率できるか・子供が自走参加するかを選択して送信します" },
                { n: "3", title: "配車結果を確認", desc: "配車が確定したら、誰の車に乗るかをアプリで確認できます" },
              ].map((step, i, arr) => (
                <div key={i} className={`flex gap-5 p-6 ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="flex-shrink-0 w-8 h-8 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm">
                    {step.n}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section id="section-cta" className="py-24 bg-gradient-to-br from-[#5d9b94] to-[#0F766E]">
        <div className="max-w-2xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">さあ、始めましょう！</h2>
          <p className="text-white/70 mb-10 text-lg">チームの送迎を、もっとスムーズに</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <TrackedLink
              href="/signup"
              trackLabel="signup_cta"
              className="inline-flex items-center justify-center h-14 px-10 rounded-2xl bg-white text-[#5d9b94] font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transform w-full sm:w-auto"
            >
              無料で始める
            </TrackedLink>
            <TrackedLink
              href="/login?guest=true"
              trackLabel="demo_cta"
              className="inline-flex items-center justify-center h-14 px-8 rounded-2xl border-2 border-white/30 hover:border-white/60 text-white font-medium transition-all w-full sm:w-auto"
            >
              デモを試す →
            </TrackedLink>
          </div>
          <TrackedLink
            href="/login"
            trackLabel="login_cta"
            className="mt-5 inline-block text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            ログイン
          </TrackedLink>
        </div>
      </section>

      <Footer />
    </div>
  );
}
