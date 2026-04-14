import Image from "next/image";
import { Car, Users, Calendar, Check, X, ChevronDown, ChevronRight, UserCog, ArrowDown } from "lucide-react";
import { Footer } from "./_components/Footer";
import { LpTracker, TrackedLink } from "./_components/LpTracker";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const teamCount = await prisma.team.count();

  return (
    <div className="min-h-screen">
      <LpTracker />
      {/* ヒーローセクション */}
      <section id="section-hero" className="relative flex flex-col items-center justify-center min-h-screen text-center px-4 pb-16 md:pb-20">
        <p className="text-xl mb-4 text-gray-800 font-medium">ExcelやLINEのやり取りはもう終わり</p>
        <h1 className="text-6xl font-bold my-8">Carpool</h1>
        <p className="text-2xl text-gray-700 mb-12 font-medium">少年野球・サッカーチームの配車を、<br />アプリ1つで管理</p>

        <div className="flex justify-center items-center gap-10 mb-12">
        <Image src="/bat.png" alt="bat" width={120} height={120} />
        <Image src="/car.png" alt="car" width={160} height={120}/>
      </div>

        <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
            すでに {teamCount} チームが利用中
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mb-8 mt-2">
          <TrackedLink
            href="/login"
            trackLabel="login_hero"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-medium transition-all shadow-md hover:shadow-lg"
          >
            ログイン
          </TrackedLink>
          <TrackedLink
            href="/signup"
            trackLabel="signup_hero"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-gradient-to-r from-[#5d9b94] to-[#0F766E] hover:from-[#4a7d77] hover:to-[#0D6B64] text-white font-medium transition-all shadow-lg hover:shadow-xl"
          >
            無料で始める
          </TrackedLink>
        </div>
        <div>
          <TrackedLink
            href="/login?guest=true"
            trackLabel="demo_hero"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium transition-all shadow-lg hover:shadow-xl"
          >
            🎭 デモを試す
          </TrackedLink>
        </div>
        
        {/* スクロール促進矢印 */}
        <div className="absolute bottom-8 md:bottom-4 animate-bounce">
          <ChevronDown size={32} className="text-gray-600" />
        </div>
      </section>

      {/* こんなお悩みありませんか？ */}
      <section id="section-problems" className="py-20 bg-gradient-to-b from-red-50 to-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">こんなお悩みありませんか？</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 hover:shadow-xl transition-all duration-300" style={{ boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <X size={20} className="text-red-500" />
                </div>
                <p className="text-gray-700 text-lg leading-normal">LINEで誰が乗せるか毎回確認してる</p>
              </div>
            </div>
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 hover:shadow-xl transition-all duration-300" style={{ boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <X size={20} className="text-red-500" />
                </div>
                <p className="text-gray-700 text-lg leading-normal">Excelの更新履歴が追えない</p>
              </div>
            </div>
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 hover:shadow-xl transition-all duration-300" style={{ boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <X size={20} className="text-red-500" />
                </div>
                <p className="text-gray-700 text-lg leading-normal">急な欠席で配車の調整が大変</p>
              </div>
            </div>
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 hover:shadow-xl transition-all duration-300" style={{ boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <X size={20} className="text-red-500" />
                </div>
                <p className="text-gray-700 text-lg leading-normal">「言った・言わない」のトラブルが心配</p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="inline-block bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl px-10 py-5 shadow-lg hover:shadow-xl transition-shadow duration-300 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={28} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-green-700">Carpoolなら全部解決！</p>
                <ChevronRight size={32} className="text-green-600 flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* アプリの特徴 */}
      <section id="section-features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">Carpoolの特徴</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#5d9b94] rounded-full flex items-center justify-center">
                  <Car size={32} className="text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">配車ドライバー管理</h3>
              <p className="text-gray-600">誰が何人乗せられるか一覧で確認。子供の割り当てまで直感的に操作できます</p>
            </div>

            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#5d9b94] rounded-full flex items-center justify-center">
                  <Users size={32} className="text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">引率者・自走にも対応</h3>
              <p className="text-gray-600">配車だけでなく引率者の管理や、自走で参加する子供の把握もアプリ1つで完結</p>
            </div>

            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#5d9b94] rounded-full flex items-center justify-center">
                  <Calendar size={32} className="text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">日程ごとに管理</h3>
              <p className="text-gray-600">試合・練習ごとに配車を個別管理。行き帰りで別々の配車にも対応しています</p>
            </div>

            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#5d9b94] rounded-full flex items-center justify-center">
                  <Check size={32} className="text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">自動アサイン</h3>
              <p className="text-gray-600">ボタン1つで子供を各ドライバーへ自動割り当て。手作業の調整時間をゼロに</p>
            </div>

            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#5d9b94] rounded-full flex items-center justify-center">
                  <ChevronRight size={32} className="text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">PINコードで簡単共有</h3>
              <p className="text-gray-600">アカウント登録不要。管理者がPINを共有するだけでメンバー全員がすぐ使えます</p>
            </div>

            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#5d9b94] rounded-full flex items-center justify-center">
                  <UserCog size={32} className="text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">出欠も一括管理</h3>
              <p className="text-gray-600">子供ごとの参加・欠席もアプリ内で管理。当日の出席確認もスムーズに行えます</p>
            </div>
          </div>
        </div>
      </section>

      {/* 使い方セクション */}
      <section id="section-how-to-use" className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">使い方</h2>

          {/* 管理者向け */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[#5d9b94] rounded-full flex items-center justify-center">
                <UserCog size={28} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#5d9b94]">管理者（コーチ・保護者代表）</h3>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">チームを作成</h4>
                  <p className="text-gray-600">会員登録後、チーム名・メンバー・子供の名前を登録します</p>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <ArrowDown size={24} className="text-[#5d9b94]" />
              </div>

              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">配車日程を作成・PINを共有</h4>
                  <p className="text-gray-600">試合や練習の日付と行き先を登録し、PINコードをLINEでメンバーに共有します</p>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <ArrowDown size={24} className="text-[#5d9b94]" />
              </div>

              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">配車・引率を確定する</h4>
                  <p className="text-gray-600">メンバーの回答を確認し、ドライバー・引率者を選択。自動アサインで子供を各車に割り当てます</p>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <ArrowDown size={24} className="text-[#5d9b94]" />
              </div>

              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">4</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">当日の出欠確認</h4>
                  <p className="text-gray-600">出席確認ページで当日の参加状況をリアルタイムに把握できます</p>
                </div>
              </div>
            </div>
          </div>

          {/* メンバー向け */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[#5d9b94] rounded-full flex items-center justify-center">
                <Users size={28} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#5d9b94]">メンバー（保護者）</h3>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">PINコードで参加</h4>
                  <p className="text-gray-600">アカウント登録不要。管理者から共有されたPINコードを入力するだけでアクセスできます</p>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <ArrowDown size={24} className="text-[#5d9b94]" />
              </div>

              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">配車・引率・自走を回答</h4>
                  <p className="text-gray-600">送迎できるか・引率できるか・子供が自走参加するかを選択して送信します</p>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <ArrowDown size={24} className="text-[#5d9b94]" />
              </div>

              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">配車結果を確認</h4>
                  <p className="text-gray-600">配車が確定したら、誰の車に乗るかをアプリで確認できます</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section id="section-cta" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-6">さあ、始めましょう！</h2>
          <p className="text-gray-600 mb-10">チームの送迎を、もっとスムーズに</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <TrackedLink
              href="/login"
              trackLabel="login_cta"
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-medium transition-all shadow-md hover:shadow-lg text-sm w-full sm:w-auto max-w-[140px]"
            >
              ログイン
            </TrackedLink>
            <TrackedLink
              href="/signup"
              trackLabel="signup_cta"
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-gradient-to-r from-[#5d9b94] to-[#0F766E] hover:from-[#4a7d77] hover:to-[#0D6B64] text-white font-medium transition-all shadow-lg hover:shadow-xl text-sm w-full sm:w-auto max-w-[140px]"
            >
              無料で始める
            </TrackedLink>
          </div>
          <div className="flex justify-center mt-4">
            <TrackedLink
              href="/login?guest=true"
              trackLabel="demo_cta"
              className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium transition-all shadow-lg hover:shadow-xl text-sm w-full sm:w-auto max-w-[200px]"
            >
              🎭 デモを試す
            </TrackedLink>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
