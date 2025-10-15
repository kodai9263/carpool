'use client';

import { supabase } from "@/src/utils/supabase";
import { useState } from "react";

export default function Page() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [disable, setDisable] = useState(false);

  return (
    <div className="flex justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 rounded-xl">
        <h1 className="text-2xl font-bold text-center mb-8">パスワード再設定</h1>
        <form className="space-y-6">
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
              新しいパスワード
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
            <button
              type="submit"
              className="w-full bg-teal-700 text-white py-2 px-4 rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
            >
              {disable ? '送信中...' : '送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}