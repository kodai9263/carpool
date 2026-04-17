"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { TrackedLink } from "./LpTracker";

type Feature = {
  title: string;
  desc: string;
  image: string;
  detail: string;
};

type Props = {
  feature: Feature | null;
  onClose: () => void;
};

export function FeatureModal({ feature, onClose }: Props) {
  // ESCキーで閉じる
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // モーダル表示中はスクロールを止める
  useEffect(() => {
    if (feature) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [feature]);

  if (!feature) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* モーダル本体 */}
      <div
        className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
          aria-label="閉じる"
        >
          <X size={16} className="text-gray-600" />
        </button>

        {/* スクリーンショット */}
        <div className="relative w-full aspect-[9/16] sm:aspect-video bg-gray-50 rounded-t-3xl overflow-hidden">
          <Image
            src={feature.image}
            alt={feature.title}
            fill
            className="object-contain"
          />
        </div>

        {/* テキスト */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{feature.detail}</p>

          {/* CTA */}
          <TrackedLink
            href="/signup"
            trackLabel="signup_feature_modal"
            className="flex items-center justify-center h-12 w-full rounded-xl bg-[#5d9b94] hover:bg-[#4a8880] text-white font-semibold transition-all shadow-md hover:shadow-lg"
          >
            無料で始める →
          </TrackedLink>
        </div>
      </div>
    </div>
  );
}
