import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, EmptyState, LoadingState, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/contexts/auth';
import { adminGet } from '@/lib/api';
import type { TeamsListResponse } from '@/types/api';

export default function HomeScreen() {
  const { session, token, isLoading, signIn, signOut } = useAuth();

  if (isLoading) {
    return <LoadingState label="ログイン状態を確認しています" />;
  }

  if (!session || !token) {
    return <LoginScreen onSubmit={signIn} />;
  }

  return <TeamsScreen token={token} email={session.user.email ?? ''} onSignOut={signOut} />;
}

function LoginScreen({
  onSubmit,
}: {
  onSubmit: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('入力してください', 'メールアドレスとパスワードを入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(email.trim(), password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログインに失敗しました。';
      Alert.alert('ログインできませんでした', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.loginContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>C</Text>
          </View>
          <Text style={styles.brandTitle}>Carpool</Text>
          <Text style={styles.brandCopy}>管理者向けスマホアプリ</Text>

          <Card style={styles.loginCard}>
            <Text style={styles.cardTitle}>ログイン</Text>
            <Text style={styles.cardDescription}>
              Web版と同じ管理者アカウントでログインできます。
            </Text>

            <Text style={styles.label}>メールアドレス</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="example@mail.com"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.label}>パスワード</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry
              placeholder="パスワード"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <AppButton
              label={isSubmitting ? 'ログイン中...' : 'ログイン'}
              onPress={handleSubmit}
              disabled={isSubmitting}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TeamsScreen({
  token,
  email,
  onSignOut,
}: {
  token: string;
  email: string;
  onSignOut: () => Promise<void>;
}) {
  const [teams, setTeams] = useState<TeamsListResponse['teams']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminGet<TeamsListResponse>('/api/admin/teams?perPage=50', token);
      setTeams(data.teams);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'チーム一覧を取得できませんでした。';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="管理者アプリ"
          title="チームを選択"
          description="アプリで作った配車もWeb版と同じデータに保存されます。"
        />

        <View style={styles.accountRow}>
          <Text style={styles.accountText}>{email}</Text>
          <Pressable onPress={onSignOut} hitSlop={12}>
            <Text style={styles.signOutText}>ログアウト</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <LoadingState label="チームを読み込んでいます" compact />
        ) : error ? (
          <EmptyState title="読み込みに失敗しました" body={error} actionLabel="再読み込み" onAction={loadTeams} />
        ) : teams.length === 0 ? (
          <EmptyState
            title="チームがありません"
            body="チーム作成はWeb版から行えます。まずはWeb版でチームを作成してください。"
            actionLabel="再読み込み"
            onAction={loadTeams}
          />
        ) : (
          <View style={styles.list}>
            {teams.map((team) => (
              <Pressable
                key={team.id}
                onPress={() =>
                  router.push({
                    pathname: '/team/[teamId]',
                    params: { teamId: String(team.id) },
                  })
                }
                style={({ pressed }) => [styles.teamCard, pressed && styles.pressed]}
              >
                <View>
                  <Text style={styles.teamName}>{team.teamName}</Text>
                  <Text style={styles.teamMeta}>配車一覧へ</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboard: {
    flex: 1,
  },
  loginContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandMark: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f766e',
    marginBottom: 14,
  },
  brandMarkText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
  },
  brandTitle: {
    textAlign: 'center',
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '800',
  },
  brandCopy: {
    marginTop: 6,
    marginBottom: 24,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  loginCard: {
    gap: 10,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
  },
  cardDescription: {
    marginBottom: 8,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    color: '#0f172a',
    fontSize: 16,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  accountRow: {
    marginTop: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accountText: {
    flex: 1,
    color: '#64748b',
    fontSize: 13,
  },
  signOutText: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '800',
  },
  list: {
    gap: 12,
  },
  teamCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe7e5',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  pressed: {
    opacity: 0.72,
  },
  teamName: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  teamMeta: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    color: '#0f766e',
    fontSize: 32,
    fontWeight: '300',
  },
});
