import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { AuthForm, authStyles } from '@/components/auth-form';
import { AppButton, LoadingState } from '@/components/ui';
import { useAuth } from '@/contexts/auth';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string | string[]; error?: string | string[]; error_code?: string | string[] }>();
  const code = typeof params.code === 'string' ? params.code : null;
  const hasLinkError = Boolean(params.error || params.error_code);
  const { completeAuthCallback, isPasswordRecovery, session, isLoading, error: authError, retry } = useAuth();
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setComplete(false);
    setError(null);
    if (!code || hasLinkError) {
      setError('リンクを確認できませんでした。期限切れの場合は、登録またはパスワード再設定をもう一度お試しください。');
      return;
    }
    void completeAuthCallback(code).then(() => {
      if (active) setComplete(true);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : '確認できませんでした。');
    });
    return () => { active = false; };
  }, [code, hasLinkError, completeAuthCallback]);

  useEffect(() => {
    if (!complete) return;
    if (isPasswordRecovery) router.replace('/password-reset');
    else if (session && !isLoading) router.replace('/');
  }, [complete, session, isLoading, isPasswordRecovery]);

  return (
    <AuthForm title="メールの確認" description="アカウントの確認が終わると、アプリに戻ります。">
      {error || authError ? <>
        <Text accessibilityRole="alert" style={authStyles.error}>{error || authError}</Text>
        {authError ? <AppButton label="アカウント確認を再試行" onPress={retry} /> : null}
        <AppButton label="ログインへ" variant="secondary" onPress={() => router.replace('/')} />
        <AppButton label="パスワード再設定へ" variant="secondary" onPress={() => router.replace('/password-reset')} />
      </> : <LoadingState label="確認しています" compact />}
    </AuthForm>
  );
}
