import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/contexts/auth';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#f8fafc' },
            headerTintColor: '#0f172a',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#f8fafc' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="team/[teamId]" options={{ title: '配車一覧' }} />
          <Stack.Screen name="team/[teamId]/rides/new" options={{ title: '配車を作成' }} />
          <Stack.Screen name="team/[teamId]/ride/[rideId]" options={{ title: '配車詳細' }} />
        </Stack>
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
