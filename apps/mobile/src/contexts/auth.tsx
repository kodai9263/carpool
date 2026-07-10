import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { publicPost } from '@/lib/api';
import { isAppConfigured } from '@/lib/config';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!isAppConfigured) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      token: session?.access_token ?? null,
      isLoading,
      signIn: async (email, password) => {
        if (!isAppConfigured) {
          throw new Error('Expoアプリの環境変数が未設定です。READMEの手順で設定してください。');
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error('メールアドレスまたはパスワードを確認してください。');
        }

        const token = data.session?.access_token;
        if (token) {
          await publicPost('/api/auth/ensure-admin', token);
        }
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [isLoading, session],
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
