import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AuthForm, AuthInput, authStyles } from '@/components/auth-form';
import { AppButton } from '@/components/ui';
import { useAuth } from '@/contexts/auth';
import { passwordError } from '@/lib/authSession';

export default function PasswordResetScreen() {
  const { requestPasswordReset, updatePassword, isPasswordRecovery, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (submitting) return;
    const validation = isPasswordRecovery ? passwordError(password, confirmation)
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'メールアドレスを確認してください。' : null;
    if (validation) { setError(validation); return; }
    setSubmitting(true);
    setError(null);
    try {
      if (isPasswordRecovery) {
        await updatePassword(password);
        setPassword('');
        setConfirmation('');
        setSaved(true);
      } else {
        await requestPasswordReset(email.trim());
        setSent(true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '手続きを完了できませんでした。');
    } finally { setSubmitting(false); }
  }

  return (
    <AuthForm title={saved ? 'パスワードを変更しました' : 'パスワード再設定'} description={isPasswordRecovery ? '新しいパスワードを設定してください。' : '登録したメールアドレスに再設定用のリンクを送ります。'}>
      {saved ? <Text style={authStyles.body}>次回から新しいパスワードでログインできます。</Text> : isPasswordRecovery ? <>
        <AuthInput label="新しいパスワード（8文字以上）" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" editable={!submitting} />
        <AuthInput label="パスワード（確認）" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" editable={!submitting} />
        <AppButton label={submitting ? '変更中...' : 'パスワードを変更'} onPress={submit} disabled={submitting} />
      </> : sent ? <Text style={authStyles.body}>該当するアカウントがある場合、メールが届きます。この端末でメールのリンクを開いてください。届かない場合は迷惑メールフォルダもご確認ください。</Text> : <>
        <AuthInput label="メールアドレス" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" placeholder="example@mail.com" editable={!submitting} />
        <AppButton label={submitting ? '送信中...' : '再設定メールを送る'} onPress={submit} disabled={submitting} />
      </>}
      {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
      <AppButton label={saved ? 'チーム一覧へ' : isPasswordRecovery ? '再設定を中止してログアウト' : '戻る'} variant="secondary" disabled={submitting} onPress={() => {
        if (!isPasswordRecovery) { router.replace('/'); return; }
        setSubmitting(true);
        void signOut().then(() => router.replace('/')).catch(() => setError('ログアウトできませんでした。通信状態を確認してください。')).finally(() => setSubmitting(false));
      }} />
    </AuthForm>
  );
}
