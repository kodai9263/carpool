import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-md w-full space-y-6">
        <div className="text-8xl mb-4">🚗💨</div>
        
        <h1 className="text-7xl font-bold text-[#0F766E] mb-2">
          404
        </h1>
        
        <h2 className="text-3xl font-bold text-gray-800">
          迷子になっちゃいました
        </h2>
        
        <p className="text-gray-600 text-lg">
          ページが見つかりません。
        </p>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-[#0F766E] hover:bg-[#0D6B64] text-white font-medium transition-all hover:shadow-lg"
          >
            トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}