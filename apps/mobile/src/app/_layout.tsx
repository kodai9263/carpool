import { Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../contexts/auth';
import { MobileAccessProvider, useMobileAccess } from '../contexts/mobile-access';
import { MobileAccessScreen } from '../components/mobile-access-screen';
import { PurchaseProvider } from '../contexts/purchases';
import { PromotedPurchaseRoute } from '../components/promoted-purchase-route';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MobileAccessProvider>
          <PurchaseProvider>
            <AppStack />
          </PurchaseProvider>
        </MobileAccessProvider>
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppStack() {
  const { session, token, isPasswordRecovery } = useAuth();
  const { status, hasOpened } = useMobileAccess();
  const path = usePathname();
  const publicRoute = path === '/signup' || path === '/password-reset' || path === '/auth/callback' || path === '/billing' || path === '/account';
  const blocked = Boolean(token) && hasOpened && status !== 'allowed' && !publicRoute;
  useEffect(() => { if (blocked) Keyboard.dismiss(); }, [blocked]);

  return (
    <View style={{ flex: 1 }}>
      <PromotedPurchaseRoute />
      {/* 再確認中も入力を残す。非表示にしてキーボード・読み上げからの操作も防ぐ。 */}
      <View style={{ flex: 1, display: blocked ? 'none' : 'flex' }}>
        <Stack
          key={session?.user.id ?? 'signed-out'}
          screenOptions={{
            headerStyle: { backgroundColor: '#f8fafc' },
            headerTintColor: '#0f172a',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#f8fafc' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ title: '新規登録' }} />
          <Stack.Screen name="password-reset" options={{ title: 'パスワード再設定' }} />
          <Stack.Screen name="auth/callback" options={{ title: 'アカウント確認' }} />
          <Stack.Screen name="billing" options={{ title: 'Proの購入・復元' }} />
          <Stack.Screen name="account" options={{ title: 'アカウント設定' }} />
          <Stack.Protected guard={Boolean(token) && hasOpened && !isPasswordRecovery}>
            <Stack.Screen name="teams/new" options={{ title: 'チームを作成' }} />
            <Stack.Screen name="team/[teamId]/members" options={{ title: '家族の登録' }} />
            <Stack.Screen name="team/[teamId]" options={{ title: '配車一覧' }} />
            <Stack.Screen name="team/[teamId]/rides/new" options={{ title: '配車を作成' }} />
            <Stack.Screen name="team/[teamId]/ride/[rideId]" options={{ title: '配車詳細' }} />
          </Stack.Protected>
        </Stack>
      </View>
      {blocked ? <View style={StyleSheet.absoluteFill}><MobileAccessScreen /></View> : null}
    </View>
  );
}
