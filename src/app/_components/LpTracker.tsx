"use client";

import Link from "next/link";
import { useEffect } from "react";

// セクションの表示をGA4に送信する
export function LpTracker() {
  useEffect(() => {
    const sections = [
      { id: "section-hero", name: "hero" },
      { id: "section-problems", name: "problems" },
      { id: "section-features", name: "features" },
      { id: "section-how-to-use", name: "how_to_use" },
      { id: "section-cta", name: "cta" },
    ];

    const observers: IntersectionObserver[] = [];

    sections.forEach(({ id, name }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // セクションが画面に入ったらイベント送信（1回だけ）
              window.gtag?.("event", "lp_section_view", { section: name });
              observer.disconnect();
            }
          });
        },
        { threshold: 0.3 } // 30%以上見えたらカウント
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return null;
}

// クリックイベントをGA4に送信するLinkラッパー
type TrackedLinkProps = React.ComponentProps<typeof Link> & {
  trackLabel: string; // 例: "signup_hero", "demo_cta"
};

export function TrackedLink({ trackLabel, onClick, ...props }: TrackedLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    window.gtag?.("event", "lp_cta_click", { button: trackLabel });
    onClick?.(e);
  };

  return <Link {...props} onClick={handleClick} />;
}

// gtagの型定義（グローバル）
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
