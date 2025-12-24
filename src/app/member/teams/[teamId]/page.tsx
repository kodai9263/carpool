'use client';

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function Page() {
	const { teamId } = useParams<{ teamId: string }>();
	const router = useRouter();
	const [pin, setPin] = useState("");

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const p = pin.trim();
		if (!pin) return alert('配車閲覧コードを入力してください');
		sessionStorage.setItem(`pin:${teamId}`, p);
		router.push(`/member/teams/${teamId}/rides`);
	};

	return (
		<div className="min-h-screen flex justify-center items-center bg-[#C8EEEC] p-6">
			<form onSubmit={onSubmit} className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
				<h1 className="text-xl font-bold text-center">配車閲覧</h1>

				<div className="space-y-1">
					<label className="text-sm font-medium">配車閲覧コード</label>
					<input 
						className="border rounded px-3 py-2 w-full"
						value={pin}
						onChange={(e) => setPin(e.target.value)}
					/>
					<p className="text-xs text-gray-500">チームメンバー共有のコードを入力してください。</p>
				</div>

				<button className="w-full bg-teal-700 text-white rounded py-2">配車表示</button>
			</form>
		</div>
	);
}