import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <p className="text-xl mb-16 text-gray-800">チームの移動、もう迷わない！</p>
      <h1 className="text-6xl font-bold mb-16">Carpool</h1>
      <p className="text-base text-gray-800 mb-16">チームスポーツのための、配車管理アプリ</p>

      <div className="flex justify-center items-center gap-10 mb-16">
        <Image src="/bat.png" alt="bat" width={120} height={120} />
        <Image src="/car.png" alt="car" width={160} height={120}/>
      </div>

      <div className="max-w-2xl mb-16 px-4">
        <h2 className="text-2xl font-bold mb-8 text-gray-800">ここは何ができるの？</h2>
        <div className="text-left space-y-4 text-gray-700">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-bold mb-2 text-[#0F766E]">📋 チーム管理</h3>
            <p className="text-sm">スポーツチームを作成し、メンバーや子供の情報を一元管理</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-bold mb-2 text-[#0F766E]">🚗 配車スケジュール</h3>
            <p className="text-sm">試合や練習の日程を登録し、送迎が必要な日を管理</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-bold mb-2 text-[#0F766E]">👥 ドライバー管理</h3>
            <p className="text-sm">保護者の送迎可否と座席数を確認し、効率的に配車を調整</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-bold mb-2 text-[#0F766E]">✅ 乗車割り当て</h3>
            <p className="text-sm">子供たちをドライバーの車に割り当て、誰がどの車に乗るか明確化</p>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <Link 
          href="/login"
          className="inline-flex items-center justify-center h-12 px-8 mr-12 rounded-lg bg-gray-300 text-gray-700 font-medium hover:opacity-80 transition"
        >
          ログイン
        </Link>
        <Link 
          href="/signup"
          className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-[#0F766E] hover:bg-[#0D6B64] text-white font-medium transition-colors"
        >
          会員登録
        </Link>
      </div>
    </div>
  );
}
