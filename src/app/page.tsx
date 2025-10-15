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

      <div className="flex gap-6">
        <Link 
          href="/login"
          className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-gray-300 text-gray-700 font-medium hover:opacity-80 transition"
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
