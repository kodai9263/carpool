import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, EmptyState, LoadingState, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/contexts/auth';
import { adminGet } from '@/lib/api';
import { env } from '@/lib/config';
import { formatRideDate } from '@/lib/format';
import type { RideDetailResponse } from '@/types/api';

export default function RideDetailScreen() {
  const params = useLocalSearchParams<{ teamId: string; rideId: string }>();
  const teamId = params.teamId;
  const rideId = params.rideId;
  const { token } = useAuth();
  const [ride, setRide] = useState<RideDetailResponse['ride'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !teamId || !rideId) return;

    setError(null);
    try {
      const data = await adminGet<RideDetailResponse>(`/api/admin/teams/${teamId}/rides/${rideId}`, token);
      setRide(data.ride);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : '配車詳細を取得できませんでした。';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [rideId, teamId, token]);

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

  const shareText = async (text: string) => {
    if (!ride?.pin) {
      Alert.alert('PINコードがありません', 'チームのPINコードを確認してください。');
      return;
    }

    try {
      await Share.share({ message: text });
    } catch {
      Alert.alert('共有できませんでした', '時間をおいて再度お試しください。');
    }
  };

  const memberUrl = `${env.webBaseUrl.replace(/\/$/, '')}/member/teams/${teamId}/rides/${rideId}`;

  const requestText = ride
    ? `${formatRideDate(ride.date)}${ride.destination ? ` ${ride.destination}` : ''}への車出し可否・お子さんの参加可否の入力をお願いします。${ride.meetingPlace ? `\n集合場所: ${ride.meetingPlace}` : ''}
${memberUrl}

PINコード: ${ride.pin ?? ''}
${ride.deadline ? `\n${new Date(ride.deadline).getMonth() + 1}月${new Date(ride.deadline).getDate()}日までにご回答をお願いします。` : ''}
`
    : '';

  const finalText = ride
    ? `${formatRideDate(ride.date)}${ride.destination ? ` ${ride.destination}` : ''}への配車割をご確認ください。${ride.meetingPlace ? `\n集合場所: ${ride.meetingPlace}` : ''}
${memberUrl}

PINコード: ${ride.pin ?? ''}

よろしくお願いします。`
    : '';

  if (!token) {
    return <LoadingState label="ログイン情報を確認しています" />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#0f766e" />}
      >
        {isLoading ? (
          <LoadingState label="配車詳細を読み込んでいます" compact />
        ) : error ? (
          <EmptyState title="読み込みに失敗しました" body={error} actionLabel="再読み込み" onAction={refresh} />
        ) : ride ? (
          <>
            <ScreenHeader
              eyebrow={formatRideDate(ride.date)}
              title={ride.destination || '配車詳細'}
              description={ride.meetingPlace ? `集合場所: ${ride.meetingPlace}` : '集合場所は未設定です。'}
            />

            <Card style={styles.shareCard}>
              <Text style={styles.sectionTitle}>LINE共有</Text>
              <Text style={styles.sectionBody}>
                回答依頼と決定後の案内を、スマホの共有シートからLINEに送れます。
              </Text>
              <View style={styles.shareActions}>
                <AppButton label="入力依頼を共有" onPress={() => shareText(requestText)} />
                <AppButton label="決定後の案内を共有" onPress={() => shareText(finalText)} variant="secondary" />
              </View>
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>配車状況</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>登録ドライバー</Text>
                <Text style={styles.statValue}>{ride.drivers.length}台</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>子ども</Text>
                <Text style={styles.statValue}>{ride.children.length}人</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>参加回答</Text>
                <Text style={styles.statValue}>
                  {ride.childAvailabilities.filter((item) => item.availability).length}件
                </Text>
              </View>
            </Card>

            {ride.drivers.length > 0 ? (
              <View style={styles.driverList}>
                {ride.drivers.map((driver) => (
                  <Card key={driver.id} style={styles.driverCard}>
                    <Text style={styles.driverName}>
                      {driver.availabilityDriver.guardian.name}号
                    </Text>
                    <Text style={styles.driverMeta}>座席: {driver.availabilityDriver.seats}人</Text>
                    <Text style={styles.driverMeta}>
                      子ども: {driver.rideAssignments.map((item) => item.child.name).join('、') || '未割り当て'}
                    </Text>
                  </Card>
                ))}
              </View>
            ) : (
              <EmptyState
                title="まだ割り当てがありません"
                body="自動割り当てや細かな手動調整は、今回のMVPではWeb版から行ってください。"
              />
            )}
          </>
        ) : null}
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
  shareCard: {
    gap: 10,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionBody: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 22,
  },
  shareActions: {
    gap: 10,
    marginTop: 4,
  },
  summaryCard: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  statValue: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  driverList: {
    gap: 12,
  },
  driverCard: {
    gap: 6,
  },
  driverName: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  driverMeta: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 22,
  },
});
