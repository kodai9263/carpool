'use client';

import { supabase } from "@/src/utils/supabase";
import Link from "next/link";
import { useState } from "react";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [disable, setDisable] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      alert('パスワードが一致しません。');
      return;
    }

    setDisable(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        alert(json?.error || '登録に失敗しました。');
        return;
      }

      setEmail('');
      setPassword('');
      setConfirmPassword('');
      alert('確認メールを送信しました。');
      router.push('/login');
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.error('予期せぬエラー', e.message);
      } else {
        console.error('予期せぬエラー', e);
      }
      alert('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setDisable(false);
    }
  };

  return (
    <div className="flex justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 rounded-xl">
        <h1 className="text-2xl font-bold text-center mb-8">会員登録</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="email"
              className="block text-sm font-medium mb-2"
            >
              メールアドレス
            </label>
            <input 
              type="email"
              name="email"
              id="email"
              className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
              placeholder="example@mail.com"
              required
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              disabled={disable}
            />
          </div>
          <div>
            <label 
              htmlFor="password"
              className="block text-sm font-medium mb-2"
            >
              パスワード
            </label>
            <input 
              type="password"
              name="password"
              id="password"
              placeholder="••••••••"
              className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
              required
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              disabled={disable}
            />
          </div>
          <div>
            <label 
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-2"
            >
              パスワード(確認)
            </label>
            <input 
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              placeholder="••••••••"
              className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
              required
              onChange={(e) => setConfirmPassword(e.target.value)}
              value={confirmPassword}
              disabled={disable}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={disable}
              className="w-full bg-teal-700 text-white py-2 px-4 rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
            >
              {disable ? '登録中...' : '登録'}
            </button>
          </div>
        </form>

        <Link
          href="/"
          className="text-center block mt-6 text-sm text-gray-700 hover:underline"
          >
            ホームに戻る
          </Link>
      </div>
    </div>
  );
}