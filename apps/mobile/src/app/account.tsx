import { Redirect, router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, LoadingState, ScreenHeader } from '../components/ui';
import { useAuth } from '../contexts/auth';
import { deleteAccount } from '../lib/api';

export default function AccountScreen() {
  const { token, session, isLoading, signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const owner = useRef(session?.user.id);
  owner.current = session?.user.id;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const open = async (url: string) => {
    setError(null);
    try { await Linking.openURL(url); }
    catch { if (mounted.current) setError('ページを開けませんでした。通信状況を確認してください。'); }
  };

  const finishSignOut = async () => {
    await signOut();
    if (mounted.current) router.replace('/');
  };

  const removeAccount = async () => {
    if (!token || !confirming || inFlight.current || deleted) return;
    const deletingOwner = owner.current;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(token);
      // 完了を待つ間に別のアカウントへ切り替わった場合、そのセッションは操作しない。
      if (!mounted.current || owner.current !== deletingOwner) return;
      setDeleted(true);
      setConfirming(false);
      try { await finishSignOut(); }
      catch { if (mounted.current) setError('アカウントは削除されました。ログアウトをもう一度お試しください。'); }
    } catch {
      if (mounted.current && owner.current === deletingOwner) {
        setError('削除の完了を確認できませんでした。通信状況を確認して再試行してください。ログインできなくなった場合はサポートへお問い合わせください。');
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  if (isLoading) return <LoadingState label="ログイン状態を確認しています" />;
  if (!token) return <Redirect href="/" />;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ headerBackVisible: !busy, gestureEnabled: !busy }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="アカウント設定" />
        <Text style={styles.body}>ログイン中：{session?.user.email}</Text>
        <Card style={styles.card}>
          <Text style={styles.title}>定期購入の管理</Text>
          <Text style={styles.body}>アカウントを削除しても、Appleの定期購入は自動で解約されません。継続しない場合は、先にAppleの設定で自動更新を停止してください。</Text>
          <AppButton label="Appleの契約を管理" variant="secondary" disabled={busy} onPress={() => void open('https://apps.apple.com/account/subscriptions')} />
          <Text style={styles.body}>Webで契約したProも、削除前にWeb版のプロフィールから解約してください。</Text>
        </Card>
        <Card style={styles.card}>
          <Text style={styles.title}>{deleted ? 'アカウントを削除しました' : 'アカウントの削除'}</Text>
          {!deleted ? (
            <>
              <Text style={styles.body}>チーム・メンバー・配車など、このアカウントのすべてのデータを完全に削除します。この操作は取り消せません。</Text>
              <Text style={styles.body}>削除したアカウントの購入権利は、別のCarpoolアカウントへ引き継げません。</Text>
              {confirming ? (
                <>
                  <Text accessibilityRole="alert" style={styles.warning}>「{session?.user.email}」を削除します。契約とデータへの影響を確認したうえで、下のボタンを押してください。</Text>
                  <AppButton label={busy ? '削除しています…' : '確認してアカウントを完全に削除'} disabled={busy} style={styles.deleteButton} onPress={() => void removeAccount()} />
                  <AppButton label="削除をやめる" variant="secondary" disabled={busy} onPress={() => setConfirming(false)} />
                </>
              ) : <AppButton label="アカウント削除の確認へ" variant="secondary" onPress={() => { setError(null); setConfirming(true); }} />}
            </>
          ) : (
            <AppButton label="ログアウト" disabled={busy} onPress={() => void finishSignOut().catch(() => setError('ログアウトできませんでした。もう一度お試しください。'))} />
          )}
        </Card>
        {error ? <Text accessibilityRole="alert" style={styles.warning}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40, gap: 20, width: '100%', maxWidth: 600, alignSelf: 'center' },
  card: { gap: 14 },
  title: { color: '#0f172a', fontSize: 18, fontWeight: '700', lineHeight: 27 },
  body: { color: '#475569', fontSize: 14, lineHeight: 23 },
  warning: { color: '#b91c1c', fontSize: 14, lineHeight: 23 },
  deleteButton: { backgroundColor: '#b91c1c' },
});
