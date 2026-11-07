import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { publicPost } from '@/lib/api';
import { authRedirectUrl } from '@/lib/authLinks';
import { createSessionVerifier } from '@/lib/authSession';
import { isAppConfigured } from '@/lib/config';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  completeAuthCallback: (code: string) => Promise<void>;
  isPasswordRecovery: boolean;
}

// 再レンダーやStrictModeで、使い捨てコードを二度交換しない。
let lastCallback: { code: string; result: Promise<void> } | null = null;

async function completeAuthCallback(code: string) {
  if (!isAppConfigured) throw new Error('現在、アプリの設定を確認中です。');
  if (lastCallback?.code === code) return lastCallback.result;
  const result = (async () => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error('リンクが期限切れか、このアプリから発行されていません。同じ端末のアプリから、もう一度手続きしてください。');
  })();
  lastCallback = { code, result };
  return result;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let authEventSeen = false;

    if (!isAppConfigured) {
      setIsLoading(false);
      return;
    }

    const verifier = createSessionVerifier(
      (token) => publicPost('/api/auth/ensure-admin', token),
      (next) => {
        setSession(next.session);
        setIsLoading(next.isLoading);
        setError(next.error);
      },
    );

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!isMounted || authEventSeen) return;
      if (sessionError) throw sessionError;
      void verifier.accept(data.session);
    }).catch(() => {
      if (!isMounted || authEventSeen) return;
      setSession(null);
      setError('ログイン状態を読み込めませんでした。再試行してください。');
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') return;
      authEventSeen = true;
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
      void verifier.accept(nextSession);
    });

    return () => {
      isMounted = false;
      verifier.dispose();
      listener.subscription.unsubscribe();
    };
  }, [retryCount]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const updateRefresh = (state: string) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    updateRefresh(AppState.currentState);
    const subscription = AppState.addEventListener('change', updateRefresh);
    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      token: session?.access_token ?? null,
      isLoading,
      error,
      isPasswordRecovery,
      retry: () => {
        setIsLoading(true);
        setRetryCount((count) => count + 1);
      },
      signIn: async (email, password) => {
        if (!isAppConfigured) {
          throw new Error('現在、アプリの接続設定を確認中です。しばらく待ってからお試しください。');
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          throw new Error('メールアドレスまたはパスワードを確認してください。');
        }
      },
      signOut: async () => {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw new Error('ログアウトできませんでした。通信状態を確認してください。');
        lastCallback = null;
        setIsPasswordRecovery(false);
      },
      signUp: async (email, password) => {
        if (!isAppConfigured) throw new Error('現在、アプリの設定を確認中です。');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (signUpError) throw new Error('登録できませんでした。入力内容と通信状態を確認してください。登録済みの場合はログインしてください。');
        return Boolean(data.session);
      },
      requestPasswordReset: async (email) => {
        if (!isAppConfigured) throw new Error('現在、アプリの設定を確認中です。');
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
        if (resetError) throw new Error('メールを送信できませんでした。しばらく待ってから再試行してください。');
      },
      completeAuthCallback,
      updatePassword: async (password) => {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw new Error('パスワードを変更できませんでした。別のパスワードで再試行するか、確認メールをもう一度送信してください。');
        setIsPasswordRecovery(false);
      },
    }),
    [error, isLoading, session, isPasswordRecovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
