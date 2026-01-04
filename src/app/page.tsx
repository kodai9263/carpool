import Link from "next/link";
import Image from "next/image";
import { Car, Users, Calendar, Check, X, ChevronDown } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ヒーローセクション */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-4">
        <p className="text-xl mb-8 text-gray-800 font-medium">ExcelやLINEのやり取りはもう終わり</p>
        <h1 className="text-6xl font-bold my-8">Carpool</h1>
        <p className="text-2xl text-gray-700 mb-12 font-medium">少年野球・サッカーチームの配車を、<br />アプリ1つで管理</p>

        <div className="flex justify-center items-center gap-10 mb-12">
          <Image src="/bat.png" alt="bat" width={120} height={120} />
          <Image src="/car.png" alt="car" width={160} height={120}/>
        </div>

        <div className="flex gap-12 mb-8 mt-4">
          <Link 
            href="/login"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-medium transition-all shadow-md hover:shadow-lg"
          >
            ログイン
          </Link>
          <Link 
            href="/signup"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-gradient-to-r from-[#5d9b94] to-[#0F766E] hover:from-[#4a7d77] hover:to-[#0D6B64] text-white font-medium transition-all shadow-lg hover:shadow-xl"
          >
            会員登録
          </Link>
        </div>
        
        {/* スクロール促進矢印 */}
        <div className="absolute bottom-8 animate-bounce">
          <ChevronDown size={32} className="text-gray-600" />
        </div>
      </section>

      {/* こんなお悩みありませんか？ */}
      <section className="py-20 bg-gradient-to-b from-red-50 to-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">こんなお悩みありませんか？</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300" style={{ boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mt-1">
                  <X size={20} className="text-red-500" />
                </div>
                <p className="text-gray-700 text-base leading-relaxed">LINEで誰が乗せるか毎回確認してる</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300" style={{ boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mt-1">
                  <X size={20} className="text-red-500" />
                </div>
                <p className="text-gray-700 text-base leading-relaxed">Excelの更新履歴が追えない</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300" style={{ boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mt-1">
                  <X size={20} className="text-red-500" />
                </div>
                <p className="text-gray-700 text-base leading-relaxed">急な欠席で配車の調整が大変</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300" style={{ boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mt-1">
                  <X size={20} className="text-red-500" />
                </div>
                <p className="text-gray-700 text-base leading-relaxed">「言った・言わない」のトラブルが心配</p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="inline-block bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl px-10 py-5 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Check size={28} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-green-700">Carpoolなら全部解決！</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* アプリの特徴 */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">Carpoolの特徴</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#5d9b94] rounded-full flex items-center justify-center">
                  <Car size={32} className="text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">簡単な配車管理</h3>
              <p className="text-gray-600">配車可否の入力から子供の割り当てまで、直感的な操作で管理できます</p>
            </div>

            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#5d9b94] rounded-full flex items-center justify-center">
                  <Users size={32} className="text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">チーム全体で共有</h3>
              <p className="text-gray-600">メンバー全員がリアルタイムで配車状況を確認・更新できます</p>
            </div>

            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#5d9b94] rounded-full flex items-center justify-center">
                  <Calendar size={32} className="text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">日程ごとに管理</h3>
              <p className="text-gray-600">試合や練習の日程ごとに、配車を個別に管理できます</p>
            </div>
          </div>
        </div>
      </section>

      {/* 使い方セクション */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">使い方</h2>
          
          {/* 管理者向け */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold mb-8 text-[#5d9b94]">👨‍💼 管理者（コーチ・保護者代表）</h3>
            <div className="space-y-6">
              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">チームを作成</h4>
                  <p className="text-gray-600">会員登録後、チーム名とメンバーを登録します</p>
                </div>
              </div>

              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">配車日程を作成</h4>
                  <p className="text-gray-600">試合や練習の日付と行き先を登録し、メンバーにPINコードを共有します</p>
                </div>
              </div>

              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">配車を編集・確認</h4>
                  <p className="text-gray-600">メンバーの配車可否を確認し、ドライバーと子供の割り当てを調整します</p>
                </div>
              </div>
            </div>
          </div>

          {/* メンバー向け */}
          <div>
            <h3 className="text-2xl font-bold mb-8 text-[#5d9b94]">👥 メンバー（保護者）</h3>
            <div className="space-y-6">
              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">PINコードで参加</h4>
                  <p className="text-gray-600">管理者から共有されたPINコードを入力して、配車ページにアクセスします</p>
                </div>
              </div>

              <div className="flex gap-4 items-start bg-white p-6 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-[#5d9b94] text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-bold text-lg mb-2">配車可否を入力</h4>
                  <p className="text-gray-600">自分が送迎可能かどうかと、車の座席数を入力します</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-6">さあ、始めましょう</h2>
          <p className="text-gray-600 mb-10">チームの送迎を、もっとスムーズに</p>
          <div className="flex gap-12 justify-center">
            <Link 
              href="/login"
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-medium transition-all shadow-md hover:shadow-lg"
            >
              ログイン
            </Link>
            <Link 
              href="/signup"
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-gradient-to-r from-[#5d9b94] to-[#0F766E] hover:from-[#4a7d77] hover:to-[#0D6B64] text-white font-medium transition-all shadow-lg hover:shadow-xl"
            >
              会員登録
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
