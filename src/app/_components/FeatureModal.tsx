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
        className="relative z-10 app-card max-h-[90vh] w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="app-icon-button absolute right-4 top-4 z-10"
          aria-label="閉じる"
        >
          <X size={16} className="text-gray-600" />
        </button>

        {/* スクリーンショット */}
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-t-xl bg-gray-50 sm:aspect-video">
          <Image
            src={feature.image}
            alt={feature.title}
            fill
            className="object-contain"
          />
        </div>

        {/* テキスト */}
        <div className="p-6">
          <h3 className="mb-2 text-xl font-bold text-gray-950">{feature.title}</h3>
          <p className="mb-6 text-sm leading-relaxed text-gray-500">{feature.detail}</p>

          {/* CTA */}
          <TrackedLink
            href="/signup"
            trackLabel="signup_feature_modal"
            className="app-button-primary w-full"
          >
            無料で始める
          </TrackedLink>
        </div>
      </div>
    </div>
  );
}
