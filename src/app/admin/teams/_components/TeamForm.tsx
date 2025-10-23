'use client';

import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TeamForm() {
  const [teamCode, setTeamCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [disable, setDisable] = useState(false);
  const { token } = useSupabaseSession();
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setDisable(true);
    if (!token) return;

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ teamName, teamCode }),
      });

      if (!res.ok) {
        throw new Error('チーム作成に失敗しました。');
      }

      const { id } = await res.json();
      router.push(`/admin/teams/${id}/rides`);
      alert('チームを作成しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('作成中にエラーが発生しました。');
    } finally {
      setDisable(false);
    }
  }

  return(
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label 
          htmlFor="teamCode"
          className="block text-sm font-medium mb-2"
        >
          チームID
        </label>
        <input 
          type="text"
          name="teamCode"
          id="teamCode"
          className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
          required
          onChange={(e) => setTeamCode(e.target.value)}
          value={teamCode}
          disabled={disable}
        />
      </div>
      <div>
        <label 
          htmlFor="teamName"
          className="block text-sm font-medium mb-2"
        >
          チーム名
        </label>
        <input 
          type="text"
          name="teamName"
          id="teamName"
          className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
          required
          onChange={(e) => setTeamName(e.target.value)}
          value={teamName}
          disabled={disable}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={disable}
          className="w-full bg-teal-700 text-white mt-4 py-2 px-4 rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
        >
          {disable ? '登録中...' : '登録'}
        </button>
      </div>
    </form>
  );
}