import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from './auth';
import { adminGet } from '../lib/api';
import { createMobileAccessController, initialMobileAccessState, type MobileAccessState } from '../lib/mobile-access';
import { setMobileWriteAccess } from '../lib/mobile-write-access';

type MobileAccessContextValue = MobileAccessState & { retry: () => void };
const MobileAccessContext = createContext<MobileAccessContextValue | null>(null);

export function MobileAccessProvider({ children }: { children: ReactNode }) {
  const { session, token, isLoading } = useAuth();
  const userId = !isLoading && token ? session?.user.id ?? null : null;
  const [state, setState] = useState(initialMobileAccessState);
  const checkedToken = useRef<string | null>(null);
  const controllerRef = useRef<ReturnType<typeof createMobileAccessController> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createMobileAccessController({
      fetchStatus: (accessToken, signal) => adminGet('/api/admin/billing/status', accessToken, { signal, cache: 'no-store' }),
      onChange: (next) => {
        setMobileWriteAccess(next.status === 'allowed' ? checkedToken.current : null);
        setState(next);
      },
    });
  }
  const controller = controllerRef.current;
  const retry = useCallback(() => {
    if (userId && token) {
      checkedToken.current = token;
      void controller.check(userId, token);
    } else {
      checkedToken.current = null;
      controller.suspend(null);
    }
  }, [controller, token, userId]);

  useEffect(() => {
    if (AppState.currentState === 'active' || AppState.currentState == null) retry();
    else controller.suspend(userId);
    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'active') retry();
      else controller.suspend(userId);
    });
    // 開きっぱなしでも契約変更を反映する。再確認中は画面側で操作を止める。
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') retry();
    }, 5 * 60 * 1000);
    return () => {
      listener.remove();
      clearInterval(timer);
      controller.suspend(userId);
    };
  }, [controller, retry, userId]);

  // アカウント切替直後、effectが動く前にも前の契約状態を使用しない。
  const owned = state.userId === userId ? state : { ...initialMobileAccessState, userId };
  const current = checkedToken.current === token ? owned : { ...owned, status: 'checking' as const };
  return <MobileAccessContext.Provider value={{ ...current, retry }}>{children}</MobileAccessContext.Provider>;
}

export function useMobileAccess() {
  const context = useContext(MobileAccessContext);
  if (!context) throw new Error('MobileAccessProvider is required');
  return context;
}
