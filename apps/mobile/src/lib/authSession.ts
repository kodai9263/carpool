import type { Session } from '@supabase/supabase-js';

export type AuthState = { session: Session | null; isLoading: boolean; error: string | null };

// 検証済みの同一ユーザーの更新では画面を取り外さず、編集中の入力を保持する。
export function createSessionVerifier(
  verify: (token: string) => Promise<unknown>,
  update: (state: AuthState) => void,
) {
  let generation = 0;
  let active = true;
  let verifiedUserId: string | null = null;

  return {
    async accept(session: Session | null) {
      if (!active) return;
      const current = ++generation;
      if (!session) {
        verifiedUserId = null;
        update({ session: null, isLoading: false, error: null });
        return;
      }
      if (verifiedUserId === session.user.id) {
        update({ session, isLoading: false, error: null });
        return;
      }
      verifiedUserId = null;
      update({ session: null, isLoading: true, error: null });
      try {
        await verify(session.access_token);
        if (!active || current !== generation) return;
        verifiedUserId = session.user.id;
        update({ session, isLoading: false, error: null });
      } catch {
        if (!active || current !== generation) return;
        update({ session: null, isLoading: false, error: '管理者アカウントを確認できませんでした。通信状態を確認して再試行してください。' });
      }
    },
    dispose() {
      active = false;
      generation += 1;
    },
  };
}

export function passwordError(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'パスワードは8文字以上で入力してください。';
  if (password !== confirmation) return '確認用パスワードが一致していません。';
  return null;
}
