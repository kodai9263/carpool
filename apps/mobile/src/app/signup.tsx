import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Text } from 'react-native';

import { AuthForm, AuthInput, authStyles } from '@/components/auth-form';
import { AppButton, LoadingState } from '@/components/ui';
import { useAuth } from '@/contexts/auth';
import { passwordError } from '@/lib/authSession';
import { env } from '@/lib/config';

export default function SignupScreen() {
  const { signUp, session, isLoading, error: authError, retry } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session && !isLoading) router.replace('/');
  }, [session, isLoading]);

  async function submit() {
    if (submitting) return;
    const validation = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? 'メールアドレスを確認してください。' : passwordError(password, confirmation);
    if (validation) { setError(validation); return; }
    setSubmitting(true);
    setError(null);
    try {
      const signedIn = await signUp(email.trim(), password);
      setPassword('');
      setConfirmation('');
      setSent(!signedIn);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '登録できませんでした。');
    } finally { setSubmitting(false); }
  }

  return (
    <AuthForm title={sent ? 'メールを確認してください' : '無料で始める'} description="管理者アカウントはWeb版と共通で使えます。">
      {sent ? <Text style={authStyles.body}>確認メールが届いたら、この端末でリンクを開いてください。迷惑メールフォルダもご確認ください。登録済みの場合はログイン、またはパスワード再設定をお試しください。</Text> : <>
        <AuthInput label="メールアドレス" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" placeholder="example@mail.com" editable={!submitting} />
        <AuthInput label="パスワード（8文字以上）" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" editable={!submitting} />
        <AuthInput label="パスワード（確認）" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" editable={!submitting} />
        <AppButton label={submitting ? '登録中...' : 'アカウントを作成'} disabled={submitting || isLoading} onPress={submit} />
        <AppButton label="プライバシーポリシー" variant="secondary" onPress={() => { void Linking.openURL(`${env.webBaseUrl.replace(/\/$/, '')}/privacy`).catch(() => setError('ページを開けませんでした。通信状態を確認してください。')); }} />
      </>}
      {isLoading ? <LoadingState label="アカウントを確認しています" compact /> : null}
      {error || authError ? <Text accessibilityRole="alert" style={authStyles.error}>{error || authError}</Text> : null}
      {authError ? <AppButton label="アカウント確認を再試行" variant="secondary" onPress={retry} /> : null}
      <AppButton label="ログインに戻る" variant="secondary" disabled={submitting} onPress={() => router.replace('/')} />
    </AuthForm>
  );
}
