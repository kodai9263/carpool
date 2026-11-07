import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, LoadingState, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/contexts/auth';
import { adminGet, adminPost } from '@/lib/api';
import { familyDraftError, familyRequest, type FamilyDraft, type MemberListResponse } from '@/lib/onboarding';
import { useUnsavedForm } from '@/lib/useUnsavedForm';
import type { TeamDetailResponse } from '@/types/api';

type GuardianRow = { key: number; name: string };
type ChildRow = GuardianRow & { grade?: number };

export default function MembersScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { token } = useAuth();
  const [team, setTeam] = useState<TeamDetailResponse['team'] | null>(null);
  const [list, setList] = useState<MemberListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [guardians, setGuardians] = useState<GuardianRow[]>([{ key: 0, name: '' }]);
  const [children, setChildren] = useState<ChildRow[]>([{ key: 1, name: '' }]);
  const nextKey = useRef(2);
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useUnsavedForm(
    guardians.some(({ name }) => Boolean(name)) || children.some(({ name, grade }) => Boolean(name) || grade !== undefined) || guardians.length > 1 || children.length > 1,
    isSubmitting,
  );

  useEffect(() => {
    if (!token || !teamId) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    void Promise.all([
      adminGet<TeamDetailResponse>(`/api/admin/teams/${teamId}`, token),
      adminGet<MemberListResponse>(`/api/admin/teams/${teamId}/members?page=${page}&perPage=20`, token),
    ]).then(([teamResponse, membersResponse]) => {
      if (!active) return;
      setTeam(teamResponse.team);
      setList(membersResponse);
    }).catch((cause: unknown) => {
      if (active) setLoadError(cause instanceof Error ? cause.message : '家族を読み込めませんでした。');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, teamId, page, refresh]);

  const save = async () => {
    if (!token || !team || submitting.current) return;
    const draft: FamilyDraft = { guardians, children };
    const validation = familyDraftError(draft, team.maxGrade);
    setFormError(validation);
    setSaved(false);
    if (validation) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      await adminPost<{ memberId: number; children: number }, FamilyDraft>(`/api/admin/teams/${teamId}/members`, token, familyRequest(draft));
      setGuardians([{ key: nextKey.current++, name: '' }]);
      setChildren([{ key: nextKey.current++, name: '' }]);
      setSaved(true);
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : '家族を登録できませんでした。');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader eyebrow={team?.teamName ?? 'チーム'} title="家族の登録" description="保護者と子どもを、家族ごとにまとめて登録します。兄弟や複数の保護者も追加できます。" />
          <AppButton label="配車一覧へ" variant="secondary" disabled={isSubmitting} onPress={() => router.replace({ pathname: '/team/[teamId]', params: { teamId } })} />
          {loadError ? <Card style={styles.form}><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><AppButton label="読み込みをやり直す" variant="secondary" onPress={() => setRefresh((value) => value + 1)} disabled={loading} /></Card> : null}
          {saved ? <Text accessibilityRole="alert" style={styles.success}>家族を登録しました。続けて次の家族を登録できます。</Text> : null}
          {!team && loading ? <LoadingState compact label="チームを読み込み中..." /> : null}
          {team ? (
            <Card style={styles.form}>
              <Text style={styles.heading}>新しい家族</Text>
              <Text style={styles.label}>保護者（1人以上）</Text>
              {guardians.map((guardian, index) => (
                <View key={guardian.key} style={styles.fieldGroup}>
                  <TextInput accessibilityLabel={`保護者 ${index + 1} の名前`} value={guardian.name} onChangeText={(name) => setGuardians((rows) => rows.map((row) => row.key === guardian.key ? { ...row, name } : row))} editable={!isSubmitting} placeholder={`保護者 ${index + 1} の名前`} placeholderTextColor="#94a3b8" style={styles.input} />
                  {guardians.length > 1 ? <AppButton label={`保護者 ${index + 1} の入力欄を取り除く`} variant="secondary" disabled={isSubmitting} onPress={() => setGuardians((rows) => rows.filter((row) => row.key !== guardian.key))} /> : null}
                </View>
              ))}
              <AppButton label="保護者を追加" variant="secondary" disabled={isSubmitting} onPress={() => { const key = nextKey.current++; setGuardians((rows) => [...rows, { key, name: '' }]); }} />
              <Text style={styles.label}>子ども</Text>
              <Text style={styles.help}>子ども・学年はあとからWebで編集できます。保護者だけの登録もできます。</Text>
              {children.map((child, index) => (
                <View key={child.key} style={styles.childGroup}>
                  <TextInput accessibilityLabel={`子ども ${index + 1} の名前`} value={child.name} onChangeText={(name) => setChildren((rows) => rows.map((row) => row.key === child.key ? { ...row, name } : row))} editable={!isSubmitting} placeholder={`子ども ${index + 1} の名前`} placeholderTextColor="#94a3b8" style={styles.input} />
                  <Text style={styles.help}>現在の学年</Text>
                  <View accessibilityRole="radiogroup" style={styles.grades}>
                    {[undefined, ...Array.from({ length: team.maxGrade }, (_, index) => index + 1)].map((grade) => (
                      <Pressable key={grade ?? 'none'} accessibilityRole="radio" accessibilityLabel={`子ども ${index + 1} の学年 ${grade ? `${grade}年` : '未設定'}`} accessibilityState={{ checked: child.grade === grade, disabled: isSubmitting }} disabled={isSubmitting} onPress={() => setChildren((rows) => rows.map((row) => row.key === child.key ? { ...row, grade } : row))} style={[styles.grade, child.grade === grade && styles.selectedGrade]}>
                        <Text style={[styles.gradeText, child.grade === grade && styles.selectedGradeText]}>{grade ? `${grade}年` : '未設定'}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {children.length > 1 ? <AppButton label={`子ども ${index + 1} の入力欄を取り除く`} variant="secondary" disabled={isSubmitting} onPress={() => setChildren((rows) => rows.filter((row) => row.key !== child.key))} /> : null}
                </View>
              ))}
              <AppButton label="子どもを追加" variant="secondary" disabled={isSubmitting} onPress={() => { const key = nextKey.current++; setChildren((rows) => [...rows, { key, name: '' }]); }} />
              {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
              <AppButton label={isSubmitting ? '登録中...' : 'この家族を登録'} onPress={() => void save()} disabled={!token || isSubmitting} />
            </Card>
          ) : null}
          <Text style={styles.heading}>登録済みの家族{list ? `（${list.total}件）` : ''}</Text>
          {loading ? <LoadingState compact label="家族を読み込み中..." /> : !loadError && list ? (
            <>
              {list.members.length === 0 ? <Card><Text style={styles.help}>まだ家族が登録されていません。上の入力欄から最初の家族を登録しましょう。</Text></Card> : list.members.map((member) => (
                <Card key={member.id} style={styles.fieldGroup}>
                  <Text style={styles.label}>{member.guardians[0]?.name ?? '保護者'} 家族</Text>
                  <Text style={styles.help}>保護者：{member.guardians.map(({ name }) => name).join('・')}</Text>
                  <Text style={styles.help}>子ども：{member.children.map(({ name }) => name).join('・') || '登録なし'}</Text>
                </Card>
              ))}
              {list.totalPages > 1 ? <View style={styles.pagination}>
                <AppButton label="前へ" variant="secondary" disabled={page <= 1} onPress={() => setPage((value) => value - 1)} />
                <Text style={styles.help}>{list.page} / {list.totalPages}</Text>
                <AppButton label="次へ" variant="secondary" disabled={page >= list.totalPages} onPress={() => setPage((value) => value + 1)} />
              </View> : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40, gap: 18 },
  form: { gap: 14 },
  heading: { color: '#0f172a', fontSize: 20, fontWeight: '800' },
  label: { color: '#334155', fontSize: 15, fontWeight: '800' },
  input: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', paddingHorizontal: 14, color: '#0f172a', fontSize: 16 },
  fieldGroup: { gap: 8 },
  childGroup: { gap: 8, borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 12 },
  help: { color: '#64748b', fontSize: 14, lineHeight: 22 },
  grades: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grade: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 10 },
  selectedGrade: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  gradeText: { color: '#334155', fontSize: 14, fontWeight: '700' },
  selectedGradeText: { color: '#ffffff' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  error: { color: '#b91c1c', fontSize: 14, lineHeight: 22 },
  success: { color: '#0f766e', fontSize: 14, lineHeight: 22, fontWeight: '700' },
});
