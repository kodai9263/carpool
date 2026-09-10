"use client";

import { useEffect, useId, useRef, useState } from "react";

type RideShareDialogProps = {
  open: boolean;
  title: string;
  text: string;
  onClose: () => void;
  onCopy: (text: string) => Promise<void>;
};

export function RideShareDialog({ open, title, text, onClose, onCopy }: RideShareDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copyingRef = useRef(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  useEffect(() => {
    setCopyMessage("");
  }, [open, text]);

  const handleCopy = async () => {
    if (copyingRef.current) return;
    copyingRef.current = true;
    setIsCopying(true);
    setCopyMessage("");
    try {
      await onCopy(text);
      setCopyMessage("文面をコピーしました。LINEなどに貼り付けて送ってください。");
    } catch {
      setCopyMessage("コピーできませんでした。もう一度お試しいただくか、上の文面を選択してコピーしてください。");
    } finally {
      copyingRef.current = false;
      setIsCopying(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl backdrop:bg-black/40 sm:p-6"
    >
      <h2 id={titleId} className="text-xl font-bold text-gray-950">{title}</h2>
      <p id={descriptionId} className="mt-2 text-sm leading-6 text-gray-600">
        保存済みの内容を共有します。文面を確認して、LINEで送信先を選ぶか、コピーして送ってください。
      </p>
      <div className="mt-4 max-h-[40dvh] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800" tabIndex={0} aria-label="共有する文面">
        {text}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a
          href={`https://line.me/R/share?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="app-button-primary w-full"
        >
          LINEで送る
        </a>
        <button type="button" onClick={handleCopy} disabled={isCopying} className="app-button-secondary w-full">
          {isCopying ? "コピー中..." : "文面をコピー"}
        </button>
      </div>
      <p className="mt-3 text-xs text-gray-500">パソコンでは文面をコピーして共有してください。</p>
      <p role="status" className="mt-3 text-sm leading-6 text-gray-700">{copyMessage}</p>
      <button type="button" onClick={onClose} className="app-button-secondary mt-3 w-full">閉じる</button>
    </dialog>
  );
}
