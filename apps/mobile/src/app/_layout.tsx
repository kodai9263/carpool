import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/contexts/auth';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppStack />
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppStack() {
  const { isLoading, token } = useAuth();

  return (
    <Stack
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
      <Stack.Protected guard={isLoading || Boolean(token)}>
        <Stack.Screen name="teams/new" options={{ title: 'チームを作成' }} />
        <Stack.Screen name="team/[teamId]/members" options={{ title: '家族の登録' }} />
        <Stack.Screen name="team/[teamId]" options={{ title: '配車一覧' }} />
        <Stack.Screen name="team/[teamId]/rides/new" options={{ title: '配車を作成' }} />
        <Stack.Screen name="team/[teamId]/ride/[rideId]" options={{ title: '配車詳細' }} />
      </Stack.Protected>
    </Stack>
  );
}
