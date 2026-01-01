'use client';

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface PinValues {
	pin: string;
}

export default function Page() {
	const { teamId } = useParams<{ teamId: string }>();
	const router = useRouter();
	
	const { register, handleSubmit, formState: { isSubmitting } } = useForm<PinValues>();

	const onSubmit = async (data: PinValues) => {
		const p = data.pin.trim();

		try {
			const response = await fetch(`/api/member/teams/${teamId}/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pin: p }),
			});

			if (!response.ok) {
				alert('配車コードが正しくありません');
				return;
			}

			sessionStorage.setItem(`pin:${teamId}`, p);
			router.push(`/member/teams/${teamId}/rides`);
		} catch (e: any) {
			alert('エラーが発生しました');
		}
	};

	return (
		<div className="min-h-screen flex justify-center items-center p-6">
			<form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
				<h1 className="text-xl font-bold text-center">配車閲覧</h1>

				<div className="space-y-1">
					<label className="text-sm font-medium">配車閲覧コード</label>
					<input
						{...register("pin", {
							required: "配車コードを入力してください",
							minLength: { value: 4, message: "4桁以上で入力してください" }
						})}
						className="border-2 border-gray-300 rounded px-3 py-2 w-full focus:border-teal-700 focus:ring-2 focus:ring-teal-700 focus:outline-none"
						type="password"
						autoComplete="off"
					/>
					<p className="text-xs text-gray-500">チームメンバー共有のコードを入力してください。</p>
				</div>

				<button
					type="submit"
					disabled={isSubmitting}
					className="w-full bg-teal-700 text-white rounded py-2"
					>
						{isSubmitting ? "確認中..." : "配車表示"}
					</button>
			</form>
		</div>
	);
}