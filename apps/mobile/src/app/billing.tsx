import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, LoadingState, ScreenHeader } from '../components/ui';
import { useAuth } from '../contexts/auth';
import { useMobileAccess } from '../contexts/mobile-access';
import { usePurchases } from '../contexts/purchases';
import { env } from '../lib/config';

export default function BillingScreen() {
  const { token, session, isLoading } = useAuth();
  const { status, retry } = useMobileAccess();
  const { config, products, promotedProductId, loading, busy, awaitingPurchase, supported, error, message, refresh, purchase, restore, manage } = usePurchases();
  const [linkError, setLinkError] = useState<string | null>(null);
  if (isLoading) return <LoadingState label="ログイン状態を確認しています" />;
  if (!token) return <Redirect href="/" />;
  const open = async (url: string) => {
    setLinkError(null);
    try { await Linking.openURL(url); }
    catch { setLinkError('ページを開けませんでした。通信状況を確認してください。'); }
  };
  const availableProducts = products.filter((product) => product.id === config?.products.monthly || product.id === config?.products.yearly);

  const promotedProduct = availableProducts.find((product) => product.id === promotedProductId);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader eyebrow="CARPOOL PRO" title="スマホでも、チームの配車を管理" description="チーム・家族の登録から、配車の作成・調整・共有まで。Pro契約はWeb版でも使えます。" />
        <Text style={styles.account}>ログイン中：{session?.user.email}</Text>
        {config?.hasWebSubscription ? (
          <Card style={styles.card}>
            <Text style={styles.title}>Webの契約・お申し込みがあります</Text>
            <Text style={styles.body}>追加購入はせず、Web版のプロフィールで契約・お支払い状況をご確認ください。Proが有効な方は、このままアプリを使えます。</Text>
          </Card>
        ) : config?.hasAppleSubscription ? (
          <Card style={styles.card}>
            <Text style={styles.title}>AppleのPro契約をご利用中です</Text>
            <Text style={styles.body}>プラン変更・自動更新の停止は「Appleの契約を管理」から行えます。</Text>
          </Card>
        ) : null}
        {loading ? <LoadingState compact label="購入情報を読み込んでいます" /> : null}
        {promotedProduct && config?.canPurchase ? <Text accessibilityRole="alert" style={styles.body}>App Storeで選択した{promotedProduct.period === 'month' ? '月額' : '年額'}プランです。ログイン中のアカウントと価格を確認し、購入ボタンからお進みください。</Text> : null}
        {!loading && supported && config?.canPurchase ? (
          <View style={styles.plans}>
            {availableProducts.map((product) => (
              <Card key={product.id} style={styles.card}>
                <Text style={styles.title}>{product.period === 'month' ? '月額プラン' : '年額プラン'}</Text>
                <Text style={styles.price}>{product.displayPrice}<Text style={styles.body}> / {product.period === 'month' ? '1か月' : '1年'}</Text></Text>
                <Text style={styles.body}>期間ごとの自動更新です。</Text>
                <AppButton label={`${product.period === 'month' ? '月額' : '年額'}プランを購入`} disabled={busy || awaitingPurchase} onPress={() => void purchase(product.id)} />
              </Card>
            ))}
            {availableProducts.length === 0 ? <Text style={styles.body}>購入できるプランを取得できませんでした。再読み込みをお試しください。</Text> : null}
            <Text style={styles.finePrint}>お支払いはApple Accountに請求されます。自動更新を停止するまで、選んだ期間ごとに更新されます。無料体験は含まれません。解約後も契約の有効期限までは利用できます。</Text>
          </View>
        ) : null}
        {message ? <Text accessibilityRole="alert" style={styles.body}>{message}</Text> : null}
        {error || linkError ? <Text accessibilityRole="alert" style={styles.error}>{linkError ?? error}</Text> : null}
        {busy ? <LoadingState compact label="購入情報を確認しています" /> : null}
        {awaitingPurchase && !busy ? <Text style={styles.body}>購入結果の確定を待っています。追加購入せず、「購入を復元」で状況を確認してください。</Text> : null}
        <AppButton label="購入情報を再読み込み" variant="secondary" disabled={busy || loading || awaitingPurchase} onPress={refresh} />
        {supported && config?.configured ? (
          <>
            <AppButton label="購入を復元" variant="secondary" disabled={busy || loading} onPress={() => void restore()} />
            <AppButton label="Appleの契約を管理" variant="secondary" disabled={busy || loading} onPress={() => void manage()} />
            <Text style={styles.finePrint}>購入時と同じApple Account・Carpoolアカウントで復元してください。再インストール後も追加購入は不要です。</Text>
          </>
        ) : null}
        <AppButton label="契約状況を再確認" variant="secondary" disabled={busy} onPress={retry} />
        {status === 'allowed' ? <AppButton label="アプリを使う" onPress={() => router.replace('/')} disabled={busy} /> : null}
        <View style={styles.legal}>
          <AppButton label="アカウント設定・削除" variant="secondary" onPress={() => router.push('/account')} />
          <AppButton label="プライバシーポリシー" variant="secondary" onPress={() => void open(`${env.webBaseUrl.replace(/\/$/, '')}/privacy`)} />
          <AppButton label="利用規約（Apple標準）" variant="secondary" onPress={() => void open('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40, gap: 18, width: '100%', maxWidth: 600, alignSelf: 'center' },
  account: { color: '#64748b', fontSize: 13, lineHeight: 21 },
  card: { gap: 12 },
  plans: { gap: 16 },
  title: { color: '#0f172a', fontSize: 18, fontWeight: '700', lineHeight: 27 },
  price: { color: '#0f766e', fontSize: 28, fontWeight: '800', lineHeight: 36 },
  body: { color: '#475569', fontSize: 14, lineHeight: 23 },
  finePrint: { color: '#64748b', fontSize: 12, lineHeight: 20 },
  error: { color: '#b91c1c', fontSize: 14, lineHeight: 23 },
  legal: { gap: 10, marginTop: 8 },
});
