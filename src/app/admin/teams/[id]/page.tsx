'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [disable, setDisable] = useState(false);
  const { id } = useParams();
  const router = useRouter();
  const { token } = useSupabaseSession();

  const { data, error, isLoading } = useFetch(`/api/admin/teams/${id}`);
  const memberCount = data?.team?.memberCount ?? 0;

  // 既存内容を表示
  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/teams/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.team)
          if (json.team.teamName) setTeamName(json.team.teamName);
          if (json.team.teamCode) setTeamCode(json.team.teamCode);
      } catch {}
    })()
  }, [id, token]);

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setDisable(true);
    if (!token) return;

    // チーム情報更新
    try {
      const res = await fetch(`/api/admin/teams/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ teamName, teamCode }),
      });

      if (!res.ok) {
        throw new Error('更新に失敗しました。');
      }
      alert('チーム詳細を更新しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('更新中にエラーが発生しました。');
    } finally {
      setDisable(false);
    }
  }

  // チーム削除
  const handleDeleteTeam = async () => {
    if (!confirm('チームを削除しますか？')) return;
    if (!token) return;
    setDisable(true);

    try {
      const res = await fetch(`/api/admin/teams/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`},
      });

      if (!res.ok) {
        throw new Error('削除に失敗しました。');
      }
      alert('チームを削除しました。');

      router.replace('/admin/teams');
    } catch (e: unknown) {
      console.error(e);
      alert('削除中にエラーが発生しました。');
    } finally {
      setDisable(false);
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8 mt-10">チーム詳細</h1>
      <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-md w-[400px] space-y-8">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold whitespace-nowrap">チーム名</h2>
            <input 
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="border border-gray-400 rounded px-2 py-1 mt-1 w-full text-center"
              disabled={disable}
            />
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold whitespace-nowrap">チームID</h2>
            <input 
              type="text"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              className="border border-gray-400 rounded px-2 py-1 mt-1 w-full text-center"
              disabled={disable}
            />
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">メンバー数</h2>
            <p className="mt-1 font-bold text-center flex-1">{memberCount}人</p>
          </div>
        </div>

        <div className="flex gap-6 mt-8">
          <button
            type="submit"
            disabled={disable}
            className="bg-green-700 text-white px-8 py-2 mx-4 rounded-lg hover:bg-green-800 transition"
          >
            {disable ? '更新中...' : '編集'}
          </button>
          <button 
            type="button"
            onClick={handleDeleteTeam}
            disabled={disable}
            className="bg-red-600 text-white px-8 py-2 mx-4 rounded-lg hover:bg-red-700 transition"
          >
            削除
          </button>
        </div>
      </form>
    </div>
  );
}