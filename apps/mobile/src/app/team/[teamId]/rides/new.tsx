import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/contexts/auth';
import { adminPost } from '@/lib/api';
import { toRideDateInput } from '@/lib/format';
import type { CreateRideResponse } from '@/types/api';

export default function NewRideScreen() {
  const params = useLocalSearchParams<{ teamId: string }>();
  const teamId = params.teamId;
  const { token } = useAuth();
  const [date, setDate] = useState('');
  const [destination, setDestination] = useState('');
  const [meetingPlace, setMeetingPlace] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!token || !teamId) return;

    const rideDate = toRideDateInput(date);
    if (!rideDate) {
      Alert.alert('日付を確認してください', '日付は YYYY-MM-DD の形式で入力してください。');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('行き先を入力してください', '配車の行き先を入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminPost<CreateRideResponse, { date: string; destination: string; meetingPlace?: string }>(
        `/api/admin/teams/${teamId}/rides`,
        token,
        {
          date: rideDate,
          destination: destination.trim(),
          meetingPlace: meetingPlace.trim() || undefined,
        },
      );
      router.replace({
        pathname: '/team/[teamId]/ride/[rideId]',
        params: { teamId, rideId: String(response.id) },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '配車を作成できませんでした。';
      Alert.alert('作成に失敗しました', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            eyebrow="新規配車"
            title="配車を作成"
            description="まず予定だけ作成して、詳細画面から回答依頼をLINE共有します。"
          />

          <Card style={styles.formCard}>
            <Text style={styles.label}>日付</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="2026-07-05"
              placeholderTextColor="#94a3b8"
              keyboardType="numbers-and-punctuation"
              style={styles.input}
            />

            <Text style={styles.label}>行き先</Text>
            <TextInput
              value={destination}
              onChangeText={setDestination}
              placeholder="大会会場・練習試合会場など"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.label}>集合場所</Text>
            <TextInput
              value={meetingPlace}
              onChangeText={setMeetingPlace}
              placeholder="学校正門、グラウンド駐車場など"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <AppButton
              label={isSubmitting ? '作成中...' : '配車を作成'}
              onPress={handleCreate}
              disabled={isSubmitting}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  formCard: {
    gap: 10,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
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
});
