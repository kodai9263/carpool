import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, LoadingState, ScreenHeader } from './ui';
import { useAuth } from '../contexts/auth';
import { useMobileAccess } from '../contexts/mobile-access';

export function MobileAccessScreen() {
  const { status, retry } = useMobileAccess();
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (status === 'checking') return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingState label="Proの契約状況を確認しています" />
      <View style={styles.accountLink}>
        <AppButton label="アカウント設定・削除" variant="secondary" onPress={() => router.push('/account')} />
      </View>
    </SafeAreaView>
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try { await signOut(); }
    catch { setError('ログアウトできませんでした。通信状況を確認して、もう一度お試しください。'); }
    finally { setSigningOut(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader eyebrow="CARPOOL PRO" title={status === 'error' ? '契約を確認できません' : 'スマホでも、\n配車をスムーズに'} />
        <Card style={styles.card}>
          <Text style={styles.title}>{status === 'error' ? '通信状況を確認してください' : 'スマホ版にはPro契約が必要です'}</Text>
          <Text style={styles.body}>
            {status === 'error'
              ? '契約状況を確認できるまで操作をお待ちください。通信状況を確認して、もう一度お試しください。'
              : 'すでにProをご契約の方は、Web版と同じアカウントで追加料金なく利用できます。Web版の無料体験は対象外です。'}
          </Text>
          {session?.user.email ? <Text style={styles.account}>ログイン中：{session.user.email}</Text> : null}
          <AppButton label="契約状況を再確認" onPress={retry} disabled={signingOut} />
        </Card>
        {status === 'locked' ? (
          <View style={styles.note}>
            <Text style={styles.title}>Proの購入・復元</Text>
            <Text style={styles.body}>プランの確認や、以前のApple購入の復元はこちらから。</Text>
            <AppButton label="プラン・購入の復元を見る" onPress={() => router.push('/billing')} disabled={signingOut} />
          </View>
        ) : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <AppButton label="アカウント設定・削除" variant="secondary" onPress={() => router.push('/account')} disabled={signingOut} />
        <AppButton label={signingOut ? 'ログアウト中…' : 'ログアウト'} variant="secondary" onPress={() => void handleSignOut()} disabled={signingOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  accountLink: { padding: 24 },
  content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, gap: 24 },
  card: { gap: 16 },
  title: { fontSize: 18, lineHeight: 27, fontWeight: '700', color: '#0f172a' },
  body: { fontSize: 14, lineHeight: 23, color: '#475569' },
  account: { fontSize: 13, lineHeight: 21, color: '#64748b' },
  note: { gap: 8 },
  error: { fontSize: 14, lineHeight: 22, color: '#b91c1c' },
});
