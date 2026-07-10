import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, EmptyState, LoadingState, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/contexts/auth';
import { adminGet } from '@/lib/api';
import { formatRideDate } from '@/lib/format';
import type { RideListResponse, TeamDetailResponse } from '@/types/api';

export default function TeamRidesScreen() {
  const params = useLocalSearchParams<{ teamId: string }>();
  const teamId = params.teamId;
  const { token } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [rides, setRides] = useState<RideListResponse['rides']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !teamId) return;

    setError(null);
    try {
      const [teamData, ridesData] = await Promise.all([
        adminGet<TeamDetailResponse>(`/api/admin/teams/${teamId}`, token),
        adminGet<RideListResponse>(`/api/admin/teams/${teamId}/rides?perPage=50`, token),
      ]);
      setTeamName(teamData.team.teamName);
      setRides(ridesData.rides);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : '配車一覧を取得できませんでした。';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [teamId, token]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load();
    }, [load]),
  );

  const refresh = () => {
    setIsRefreshing(true);
    load();
  };

  if (!token) {
    return <LoadingState label="ログイン情報を確認しています" />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#0f766e" />}
      >
        <ScreenHeader
          eyebrow={teamName || 'チーム'}
          title="配車一覧"
          description="スマホから配車予定を作成し、LINE共有まで進められます。"
        />

        <View style={styles.actions}>
          <AppButton
            label="配車を作成"
            onPress={() =>
              router.push({
                pathname: '/team/[teamId]/rides/new',
                params: { teamId },
              })
            }
          />
          <AppButton label="チーム一覧へ" onPress={() => router.back()} variant="secondary" />
        </View>

        {isLoading ? (
          <LoadingState label="配車を読み込んでいます" compact />
        ) : error ? (
          <EmptyState title="読み込みに失敗しました" body={error} actionLabel="再読み込み" onAction={refresh} />
        ) : rides.length === 0 ? (
          <EmptyState
            title="配車予定がありません"
            body="最初の配車を作成して、LINEで回答依頼を共有しましょう。"
            actionLabel="配車を作成"
            onAction={() =>
              router.push({
                pathname: '/team/[teamId]/rides/new',
                params: { teamId },
              })
            }
          />
        ) : (
          <View style={styles.list}>
            {rides.map((ride) => (
              <Pressable
                key={ride.id}
                onPress={() =>
                  router.push({
                    pathname: '/team/[teamId]/ride/[rideId]',
                    params: { teamId, rideId: String(ride.id) },
                  })
                }
                style={({ pressed }) => [styles.rideCard, pressed && styles.pressed]}
              >
                <View style={styles.rideContent}>
                  <Text style={styles.rideDate}>{formatRideDate(ride.date)}</Text>
                  <Text style={styles.rideDestination}>{ride.destination || '行き先未設定'}</Text>
                  {ride.meetingPlace ? <Text style={styles.rideMeta}>集合: {ride.meetingPlace}</Text> : null}
                </View>
                <View style={ride.isAssignmentComplete ? styles.doneBadge : styles.pendingBadge}>
                  <Text style={ride.isAssignmentComplete ? styles.doneBadgeText : styles.pendingBadgeText}>
                    {ride.isAssignmentComplete ? '割当済' : '調整中'}
                  </Text>
                </View>
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
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  actions: {
    gap: 10,
  },
  list: {
    gap: 12,
  },
  rideCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe7e5',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  pressed: {
    opacity: 0.72,
  },
  rideContent: {
    flex: 1,
    gap: 4,
  },
  rideDate: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '800',
  },
  rideDestination: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  rideMeta: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  doneBadge: {
    borderRadius: 999,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingBadge: {
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  doneBadgeText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '800',
  },
  pendingBadgeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '800',
  },
});
