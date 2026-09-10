"use client";

import { useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { validateBulkFamilies, type BulkFamily } from "@/utils/bulkMembers";

type Row = { guardianName: string; childName: string; grade: string };
const emptyRow = (): Row => ({ guardianName: "", childName: "", grade: "" });

type Props = { maxGrade: number; onSave: (families: BulkFamily[]) => Promise<void> };

export default function BulkMemberForm({ maxGrade, onSave }: Props) {
  const { register, control, handleSubmit } = useForm<{ families: Row[] }>({
    defaultValues: { families: [emptyRow(), emptyRow(), emptyRow()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "families" });
  const [preview, setPreview] = useState<BulkFamily[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);

  const review = handleSubmit(({ families }) => {
    setError("");
    const entered = families.map((row, index) => ({ row, index })).filter(({ row }) => row.guardianName.trim() || row.childName.trim() || row.grade);
    try {
      setPreview(validateBulkFamilies(entered.map(({ row }) => ({ ...row, grade: row.grade === "" ? null : Number(row.grade) })), maxGrade));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "入力内容を確認してください。";
      // 空行を除いて検証しても、エラーの行番号は画面上の番号に合わせる。
      setError(message.replace(/^(\d+)行目/, (_, number) => `${(entered[Number(number) - 1]?.index ?? Number(number) - 1) + 1}行目`));
    }
  });

  const save = async () => {
    if (!preview || savingRef.current || saved) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave(preview);
      setSaved(true);
    } catch (cause) {
      setError((cause as { message?: string })?.message || "登録結果を確認できませんでした。家族一覧を確認してから再試行してください。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="mb-5 text-sm leading-6 text-gray-600">1行につき1家族。兄弟や保護者の追加は、登録後に家族を開いて編集できます。</p>
      <form onSubmit={review} hidden={preview !== null} className="space-y-4">
        {fields.map((field, index) => (
          <fieldset key={field.id} className="rounded-xl border border-gray-200 p-4">
            <legend className="px-1 text-sm font-semibold text-gray-700">家族 {index + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_7rem_auto] sm:items-end">
              <label className="min-w-0 text-sm font-medium text-gray-700">保護者名
                <input {...register(`families.${index}.guardianName`)} maxLength={100} autoComplete="off" className="app-input mt-1 w-full" />
              </label>
              <label className="min-w-0 text-sm font-medium text-gray-700">子ども名
                <input {...register(`families.${index}.childName`)} maxLength={100} autoComplete="off" className="app-input mt-1 w-full" />
              </label>
              <label className="text-sm font-medium text-gray-700">学年
                <select {...register(`families.${index}.grade`)} className="app-input mt-1 w-full">
                  <option value="">未設定</option>
                  {Array.from({ length: maxGrade }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}年</option>)}
                </select>
              </label>
              <button type="button" onClick={() => remove(index)} disabled={fields.length === 1} aria-label={`家族${index + 1}の入力行を削除`} className="app-button-secondary">行を削除</button>
            </div>
          </fieldset>
        ))}
        <button type="button" onClick={() => append(emptyRow())} disabled={fields.length >= 50} className="app-button-secondary w-full">＋ 家族を追加</button>
        <p className="text-xs text-gray-500">一度に50家族まで。空の行は登録されません。</p>
        <button type="submit" className="app-button-primary w-full">登録内容を確認</button>
      </form>
      {preview && (
        <section aria-label="登録内容の確認">
          <h2 className="mb-3 text-lg font-bold">{preview.length}家族を登録します</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b"><th className="p-2">保護者</th><th className="p-2">子ども</th><th className="p-2 whitespace-nowrap">学年</th></tr></thead>
              <tbody>{preview.map((family, i) => <tr key={i} className="border-b"><td className="max-w-48 break-words p-2">{family.guardianName}</td><td className="max-w-48 break-words p-2">{family.childName}</td><td className="p-2 whitespace-nowrap">{family.grade === null ? "未設定" : `${family.grade}年`}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled={saving || saved} onClick={() => { setPreview(null); setError(""); }} className="app-button-secondary sm:flex-1">入力に戻る</button>
            <button type="button" disabled={saving || saved} onClick={save} className="app-button-primary sm:flex-1">{saved ? "登録しました" : saving ? "登録中..." : `${preview.length}家族を登録`}</button>
          </div>
        </section>
      )}
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </div>
  );
}
