import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/contexts/auth';
import { adminPost } from '@/lib/api';
import { teamDraftError, type TeamDraft } from '@/lib/onboarding';
import { useUnsavedForm } from '@/lib/useUnsavedForm';

export default function NewTeamScreen() {
  const { token } = useAuth();
  const [draft, setDraft] = useState<TeamDraft>({ teamName: '', pin: '', isMiddleSchool: false });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const allowSavedNavigation = useUnsavedForm(Boolean(draft.teamName || draft.pin || draft.isMiddleSchool), isSubmitting);

  const create = async () => {
    if (!token || submitting.current) return;
    const validation = teamDraftError(draft);
    setError(validation);
    if (validation) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      const response = await adminPost<{ id: number }, TeamDraft>('/api/admin/teams', token, {
        ...draft, teamName: draft.teamName.trim(), pin: draft.pin.trim(),
      });
      allowSavedNavigation();
      router.replace({ pathname: '/team/[teamId]/members', params: { teamId: String(response.id) } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'チームを作成できませんでした。');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader eyebrow="はじめの設定" title="チームを作成" description="チームを作ったら、参加する家族を登録しましょう。" />
          <Card style={styles.form}>
            <Text style={styles.label}>チーム名</Text>
            <TextInput accessibilityLabel="チーム名" value={draft.teamName} onChangeText={(teamName) => setDraft((value) => ({ ...value, teamName }))} editable={!isSubmitting} placeholder="〇〇ジュニア" placeholderTextColor="#94a3b8" style={styles.input} />
            <Text style={styles.label}>保護者に共有するPIN</Text>
            <TextInput accessibilityLabel="共有PIN（4桁以上の数字）" value={draft.pin} onChangeText={(pin) => setDraft((value) => ({ ...value, pin }))} editable={!isSubmitting} keyboardType="number-pad" secureTextEntry placeholder="4桁以上の数字" placeholderTextColor="#94a3b8" style={styles.input} />
            <Text style={styles.help}>チームの保護者だけに共有する合言葉です。</Text>
            <View style={styles.switchRow}>
              <View style={styles.switchText}><Text style={styles.label}>中学生のチーム</Text><Text style={styles.help}>{draft.isMiddleSchool ? '登録できる学年：1〜3年' : '登録できる学年：1〜6年'}</Text></View>
              <Switch accessibilityLabel="中学生のチーム" value={draft.isMiddleSchool} onValueChange={(isMiddleSchool) => setDraft((value) => ({ ...value, isMiddleSchool }))} disabled={isSubmitting} trackColor={{ true: '#0f766e' }} />
            </View>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <AppButton label={isSubmitting ? '作成中...' : 'チームを作成'} onPress={() => void create()} disabled={!token || isSubmitting} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40, gap: 18 },
  form: { gap: 12 },
  label: { color: '#334155', fontSize: 14, fontWeight: '800' },
  input: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', paddingHorizontal: 14, color: '#0f172a', fontSize: 16 },
  help: { color: '#64748b', fontSize: 13, lineHeight: 21 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  switchText: { flex: 1, gap: 4 },
  error: { color: '#b91c1c', fontSize: 14, lineHeight: 22 },
});
