'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface Props {
  className?: string;
}

export const AddToHomeScreenButton: React.FC<Props> = ({ className = '' }) => {
  // Androidのbeforeinstallpromptイベントを保持
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // すでにホーム画面から起動済み（スタンドアロンモード）なら非表示
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // iOS（Safari）の検出
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) {
      setIsIOS(true);
      setIsVisible(true);
      return;
    }

    // Android/Chrome: インストールプロンプトイベントを捕捉
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // インストール完了後は非表示
    window.addEventListener('appinstalled', () => setIsVisible(false));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isVisible) return null;

  const handleClick = async () => {
    if (isIOS) {
      // iOSはプログラムからプロンプトを出せないため手順を案内
      setShowIOSGuide(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <>
      <button onClick={handleClick} className={className}>
        <Download size={24} />
        <span className="mt-1">ホーム追加</span>
      </button>

      {/* iOSユーザー向け手順モーダル */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-gray-800">ホーム画面に追加</h3>
              <button onClick={() => setShowIOSGuide(false)}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <ol className="space-y-4 text-sm text-gray-700">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <span>Safariの下部にある <Share size={13} className="inline align-middle" /> 共有ボタンをタップ</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <span>「ホーム画面に追加」を選択</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <span>右上の「追加」をタップ</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
};
