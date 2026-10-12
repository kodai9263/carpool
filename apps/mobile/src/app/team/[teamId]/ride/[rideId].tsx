import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, EmptyState, LoadingState, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/contexts/auth';
import { adminGet, adminPost, adminPut } from '@/lib/api';
import {
  assignedChildIds,
  availableDriverCandidates,
  assignmentError,
  autoAssignmentBlockReason,
  autoAssignmentResultError,
  type AutoAssignBillingStatus,
  buildUpdateAssignmentBody,
  createAssignmentDraft,
  type AssignmentDriver,
  type Direction,
  type UpdateAssignmentBody,
} from '@/lib/assignment';
import { env } from '@/lib/config';
import { formatRideDate } from '@/lib/format';
import type { RideDetailResponse } from '@/types/api';

export default function RideDetailScreen() {
  const params = useLocalSearchParams<{ teamId: string; rideId: string }>();
  const teamId = params.teamId;
  const rideId = params.rideId;
  const { token } = useAuth();
  const navigation = useNavigation();
  const [ride, setRide] = useState<RideDetailResponse['ride'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AssignmentDriver[] | null>(null);
  const [savedDraft, setSavedDraft] = useState<AssignmentDriver[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [billing, setBilling] = useState<AutoAssignBillingStatus | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateConfirmation, setShowGenerateConfirmation] = useState(false);
  const operationRef = useRef(false);
  const dirtyRef = useRef(false);
  const loadedRideKey = useRef<string | null>(null);
  const hasRideRef = useRef(false);

  const isDirty = draft !== null && savedDraft !== null && JSON.stringify(draft) !== JSON.stringify(savedDraft);
  dirtyRef.current = isDirty;
  hasRideRef.current = ride !== null;

  usePreventRemove(isDirty || isSaving || isGenerating, ({ data }) => {
    if (operationRef.current) {
      Alert.alert('処理中です', '配車の処理が終わるまでこの画面でお待ちください。');
      return;
    }
    const leave = () => navigation.dispatch(data.action);
    if (Platform.OS === 'web') {
      if (window.confirm('未保存の配車を破棄して戻りますか？')) leave();
    } else {
      Alert.alert('変更を破棄して戻りますか？', '未保存の配車は残りません。', [
        { text: '編集を続ける', style: 'cancel' },
        { text: '破棄して戻る', style: 'destructive', onPress: leave },
      ]);
    }
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || (!isDirty && !isSaving && !isGenerating)) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [isDirty, isSaving, isGenerating]);

  const loadBilling = useCallback(async () => {
    if (!token) return;
    setBillingError(null);
    try {
      const data = await adminGet<{ autoAssign: AutoAssignBillingStatus }>('/api/admin/billing/status', token);
      setBilling(data.autoAssign);
    } catch {
      setBilling(null);
      setBillingError('自動割り当ての利用状況を取得できませんでした。手動調整は利用できます。');
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void loadBilling(); }, [loadBilling]));

  const load = useCallback(async () => {
    if (!token || !teamId || !rideId) return;

    setError(null);
    try {
      const data = await adminGet<RideDetailResponse>(`/api/admin/teams/${teamId}/rides/${rideId}`, token);
      setRide(data.ride);
      loadedRideKey.current = `${teamId}:${rideId}`;
      const loadedDraft = createAssignmentDraft(data.ride);
      setDraft(loadedDraft);
      setSavedDraft(loadedDraft);
      setOpenPicker(null);
      setSaveError(null);
      setSaveNotice(null);
      setNeedsRefresh(false);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : '配車詳細を取得できませんでした。';
      if (hasRideRef.current) {
        setSaveError(`再読み込みできませんでした。${message}`);
        setNeedsRefresh(true);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [rideId, teamId, token]);

  useFocusEffect(
    useCallback(() => {
      if (operationRef.current) return;
      if (dirtyRef.current && loadedRideKey.current === `${teamId}:${rideId}`) return;
      if (loadedRideKey.current !== `${teamId}:${rideId}`) {
        hasRideRef.current = false;
        setRide(null);
        setDraft(null);
        setSavedDraft(null);
      }
      setIsLoading(true);
      load();
    }, [load, rideId, teamId]),
  );

  const refresh = () => {
    if (operationRef.current) return;
    if (isDirty) {
      setSaveError('未保存の変更があります。変更を破棄してから再読み込みしてください。');
      setIsRefreshing(false);
      return;
    }
    setIsRefreshing(true);
    setIsLoading(true);
    load();
  };

  const forceReload = () => {
    if (operationRef.current) return;
    const reload = () => {
      setIsRefreshing(true);
      setIsLoading(true);
      void load();
    };
    if (!isDirty) { reload(); return; }
    if (Platform.OS === 'web') {
      if (window.confirm('未保存の変更を破棄して再読み込みしますか？')) reload();
    } else {
      Alert.alert('変更を破棄しますか？', '未保存の変更を破棄して最新情報を読み込みます。', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '再読み込み', style: 'destructive', onPress: reload },
      ]);
    }
  };

  const discardChanges = () => {
    if (!savedDraft || operationRef.current) return;
    setDraft(savedDraft);
    setOpenPicker(null);
    setSaveError(null);
    setSaveNotice(null);
  };

  const addDriver = (availabilityDriverId: number, direction: Direction) => {
    const answer = ride?.availabilityDrivers.find((item) => item.id === availabilityDriverId);
    if (!answer) return;
    setDraft((current) => {
      if (!current || current.some((item) =>
        item.availabilityDriverId === availabilityDriverId && item.direction === direction)) return current;
      return [
        ...current,
        { availabilityDriverId, type: 'driver', direction, seats: answer.seats, rideAssignments: [], escorts: [] },
      ];
    });
    setOpenPicker(null);
    setSaveError(null);
    setSaveNotice(null);
  };

  const removeDriver = (availabilityDriverId: number, direction: Direction) => {
    const selected = draft?.find((item) => item.availabilityDriverId === availabilityDriverId && item.direction === direction);
    if (!selected) return;
    const remove = () => {
      setDraft((current) => current?.filter((item) =>
        item.availabilityDriverId !== availabilityDriverId || item.direction !== direction) ?? null);
      setOpenPicker(null);
      setSaveError(null);
      setSaveNotice(null);
    };
    if (selected.rideAssignments.length > 0 || selected.escorts.length > 0) {
      if (Platform.OS === 'web') {
        if (window.confirm('この車を外しますか？ 子どもと引率者の割り当ても外れます。')) remove();
      } else {
        Alert.alert('この車を外しますか？', '乗車する子どもと引率者の割り当ても外れます。', [
          { text: 'キャンセル', style: 'cancel' },
          { text: '外す', style: 'destructive', onPress: remove },
        ]);
      }
    } else {
      remove();
    }
  };

  const changeChild = (availabilityDriverId: number, direction: Direction, childId: number, add: boolean) => {
    setDraft((current) => current?.map((driver) =>
      driver.availabilityDriverId === availabilityDriverId && driver.direction === direction
        ? {
            ...driver,
            rideAssignments: add
              ? driver.rideAssignments.some((item) => item.childId === childId)
                ? driver.rideAssignments
                : [...driver.rideAssignments, { childId }]
              : driver.rideAssignments.filter((item) => item.childId !== childId),
          }
        : driver) ?? null);
    setSaveError(null);
    setSaveNotice(null);
  };

  const generate = async () => {
    if (!ride || !draft || !token || operationRef.current || needsRefresh || !billing?.canUseAutoAssign) return;
    const blocked = autoAssignmentBlockReason(ride, draft);
    if (blocked) { setSaveError(blocked); return; }
    operationRef.current = true;
    setIsGenerating(true);
    setShowGenerateConfirmation(false);
    setSaveError(null);
    setSaveNotice(null);
    setOpenPicker(null);
    try {
      const result = await adminPost<
        { drivers: AssignmentDriver[]; billing: AutoAssignBillingStatus },
        { separateParentChild: boolean }
      >(`/api/admin/teams/${teamId}/rides/${rideId}/auto-assign`, token, { separateParentChild: false });
      setBilling(result.billing);
      const invalid = autoAssignmentResultError(ride, result.drivers);
      if (invalid) {
        setSaveError(`${invalid} 案の作成は実行済みのため、無料残回数をご確認ください。`);
        setNeedsRefresh(true);
        return;
      }
      setDraft(result.drivers);
      setSaveNotice('配車案を作成しました。行き・帰りと乗車する子どもを確認し、必要に応じて調整して保存してください。');
    } catch (failure) {
      const status = (failure as Error & { status?: number }).status;
      setSaveError(status === 402
        ? '無料の自動割り当て回数を使い切りました。上限後はProが必要です。アプリ内購入は準備中です。手動調整は引き続き使えます。'
        : `${failure instanceof Error ? failure.message : '配車案を作成できませんでした。'} 通信が途切れた場合も回数を消費している可能性があります。残回数をご確認ください。`);
      await loadBilling();
    } finally {
      operationRef.current = false;
      setIsGenerating(false);
    }
  };


  const save = async () => {
    if (!ride || !draft || !token || operationRef.current || needsRefresh) return;
    const validationError = assignmentError(ride, draft);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    operationRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    setSaveNotice(null);
    try {
      await adminPut<{ status: 'OK' }, UpdateAssignmentBody>(
        `/api/admin/teams/${teamId}/rides/${rideId}`,
        token,
        buildUpdateAssignmentBody(ride, draft),
      );
    } catch (saveFailure) {
      const status = (saveFailure as Error & { status?: number }).status;
      setSaveError(status === 409
        ? 'ほかの画面で回答や配車が更新されました。変更を確認してから再読み込みしてください。'
        : saveFailure instanceof Error ? saveFailure.message : '保存できませんでした。');
      if (status === 409) setNeedsRefresh(true);
      operationRef.current = false;
      setIsSaving(false);
      return;
    }
    try {
      const data = await adminGet<RideDetailResponse>(`/api/admin/teams/${teamId}/rides/${rideId}`, token);
      const loadedDraft = createAssignmentDraft(data.ride);
      setRide(data.ride);
      setDraft(loadedDraft);
      setSavedDraft(loadedDraft);
      setOpenPicker(null);
      setSaveNotice('配車を保存しました。内容を確認してから決定後の案内を共有してください。');
    } catch {
      setNeedsRefresh(true);
      setSaveNotice('保存は完了しました。最新の配車を取得できないため、再読み込みして確認してください。');
    } finally {
      operationRef.current = false;
      setIsSaving(false);
    }
  };

  const shareText = async (text: string, final = false) => {
    if (operationRef.current || (final && (dirtyRef.current || needsRefresh || !isAssignmentComplete))) return;
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
  const requestUrl = `${memberUrl}/availability`;

  const requestText = ride
    ? `${formatRideDate(ride.date)}${ride.destination ? ` ${ride.destination}` : ''}への車出し可否・お子さんの参加可否の入力をお願いします。${ride.meetingPlace ? `\n集合場所: ${ride.meetingPlace}` : ''}
${requestUrl}

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

  const answeredIds = new Set(ride?.availabilityDrivers.map((answer) => answer.guardian.id) ?? []);
  const unanswered = ride?.guardians.filter((guardian) => !answeredIds.has(guardian.id)) ?? [];
  const participatingChildIds = new Set(ride?.childAvailabilities
    .filter((answer) => answer.availability && !answer.selfDriving)
    .map((answer) => answer.childId) ?? []);
  const participatingChildren = ride?.children.filter((child) => participatingChildIds.has(child.id)) ?? [];
  const directions: Direction[] = ride?.separateDirections ? ['outbound', 'inbound'] : ['outbound'];
  const isAssignmentComplete = participatingChildren.length > 0 && directions.every((direction) => {
    const assigned = assignedChildIds(draft ?? [], direction);
    return participatingChildren.every((child) => assigned.has(child.id));
  });

  const autoBlockReason = ride && draft ? autoAssignmentBlockReason(ride, draft) : null;

  if (!token) {
    return <LoadingState label="ログイン情報を確認しています" />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#0f766e" />}
      >
        {isLoading || isSaving || isGenerating ? (
          <LoadingState label={isGenerating ? '配車案を作成しています' : isSaving ? '配車を保存しています' : '配車詳細を読み込んでいます'} compact />
        ) : error ? (
          <EmptyState title="読み込みに失敗しました" body={error} actionLabel="再読み込み" onAction={refresh} />
        ) : ride ? (
          <>
            <ScreenHeader
              eyebrow={formatRideDate(ride.date)}
              title={ride.destination || '配車詳細'}
              description={ride.meetingPlace ? `集合場所: ${ride.meetingPlace}` : '集合場所は未設定です。'}
            />

            <Card style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>回答状況</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>保護者の回答</Text>
                <Text style={styles.statValue}>{ride.guardians.length - unanswered.length}/{ride.guardians.length}人</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>乗車する子ども</Text>
                <Text style={styles.statValue}>{participatingChildren.length}人</Text>
              </View>
              {unanswered.length > 0 ? (
                <View style={styles.answerNotice}>
                  <Text style={styles.noticeTitle}>未回答 {unanswered.length}人</Text>
                  <Text style={styles.sectionBody}>{unanswered.map((guardian) => guardian.name).join('、')}</Text>
                </View>
              ) : (
                <Text style={styles.successText}>全員が回答済みです。</Text>
              )}
            </Card>

            <Card style={styles.saveCard}>
              <Text style={styles.sectionTitle}>配車案を自動作成</Text>
              <Text style={styles.sectionBody}>
                {billing ? billing.isPro ? 'Proプラン：回数制限なし' : billing.isExempt ? '回数制限なしで利用できます。' : `無料お試し：残り${billing.remaining}回（全${billing.freeLimit}回）` : billingError ? '利用状況を確認できません。' : '利用状況を確認しています。'}
              </Text>
              <Text style={styles.sectionBody}>
                案を作成したら、下の画面で調整して保存できます。引率者の自動割り当ては行いません。
                {billing && !billing.isPro && !billing.isExempt ? '保存しなくても案の作成ごとに無料回数を1回消費します。' : ''}
              </Text>
              {billing && !billing.canUseAutoAssign ? (
                <Text style={styles.sectionBody}>無料回数の上限後はProが必要です。アプリ内購入は準備中です。手動調整は引き続き使えます。</Text>
              ) : null}
              {autoBlockReason ? <Text style={styles.sectionBody}>{autoBlockReason}</Text> : null}
              {billingError ? <Text style={styles.errorText}>{billingError}</Text> : null}
              {showGenerateConfirmation ? (
                <View style={styles.answerNotice}>
                  <Text style={styles.noticeTitle}>配車案を自動作成しますか？</Text>
                  <Text style={styles.sectionBody}>
                    {draft?.length ? '画面上の配車案を作り直します。未保存の調整は置き換わります。' : '回答をもとに配車案を作成します。'}
                    案は保存するまで共有されません。
                    {billing?.isPro || billing?.isExempt ? '' : '案を1回作成するごとに無料回数を1回消費します。'}
                    引率者の自動割り当ては行いません。
                  </Text>
                  <AppButton label="作成する" onPress={() => { void generate(); }} disabled={!billing?.canUseAutoAssign || Boolean(autoBlockReason) || needsRefresh || isGenerating || isSaving} />
                  <AppButton label="戻る" onPress={() => setShowGenerateConfirmation(false)} variant="secondary" disabled={isGenerating || isSaving} />
                </View>
              ) : (
                <AppButton label="配車案を自動作成" onPress={() => setShowGenerateConfirmation(true)} disabled={!billing?.canUseAutoAssign || Boolean(autoBlockReason) || needsRefresh || isGenerating || isSaving} />
              )}
              <AppButton label="利用状況を更新" onPress={() => { void loadBilling(); }} variant="secondary" />
            </Card>

            <View style={styles.assignmentSection}>
              <Text style={styles.sectionTitle}>手動で配車を調整</Text>
              <Text style={styles.sectionBody}>
                車出し可能・参加と回答した人から選びます。変更は保存するまで共有されません。
              </Text>
              {directions.map((direction) => {
                const directionLabel = ride.separateDirections
                  ? direction === 'inbound' ? '帰り' : '行き'
                  : '行き・帰り共通';
                const selected = (draft ?? []).filter((driver) => driver.direction === direction);
                const candidates = availableDriverCandidates(ride, draft ?? [], direction);
                const usedChildren = assignedChildIds(draft ?? [], direction);
                const unassignedChildren = participatingChildren.filter((child) => !usedChildren.has(child.id));
                return (
                  <Card key={direction} style={styles.directionCard}>
                    <Text style={styles.directionTitle}>{directionLabel}</Text>
                    <Text style={styles.sectionBody}>
                      {selected.length}台 · 子ども {participatingChildren.length - unassignedChildren.length}/{participatingChildren.length}人を割り当て済み
                    </Text>
                    {unassignedChildren.length > 0 ? (
                      <View style={styles.answerNotice}>
                        <Text style={styles.noticeTitle}>未割り当て {unassignedChildren.length}人</Text>
                        <Text style={styles.sectionBody}>{unassignedChildren.map((child) => child.name).join('、')}</Text>
                      </View>
                    ) : null}
                    {selected.map((driver) => {
                      const answer = ride.availabilityDrivers.find((item) => item.id === driver.availabilityDriverId);
                      const name = answer?.guardian.name ?? '回答が変更された保護者';
                      const pickerKey = `child:${direction}:${driver.availabilityDriverId}`;
                      const freeChildren = participatingChildren.filter((child) => !usedChildren.has(child.id));
                      const remaining = (answer?.seats ?? driver.seats) - driver.rideAssignments.length - driver.escorts.length;
                      return (
                        <View key={`${direction}:${driver.availabilityDriverId}`} style={styles.driverCard}>
                          <View style={styles.driverHeader}>
                            <View style={styles.driverHeaderText}>
                              <Text style={styles.driverName}>{name}号</Text>
                              <Text style={styles.driverMeta}>
                                {driver.rideAssignments.length + driver.escorts.length}/{answer?.seats ?? driver.seats}席
                              </Text>
                            </View>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`${name}号を外す`}
                              onPress={() => removeDriver(driver.availabilityDriverId, direction)}
                              style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                            >
                              <Text style={styles.removeText}>車を外す</Text>
                            </Pressable>
                          </View>
                          {driver.rideAssignments.length > 0 ? driver.rideAssignments.map(({ childId }) => {
                            const childName = ride.children.find((child) => child.id === childId)?.name ?? `子ども #${childId}`;
                            return (
                              <View key={childId} style={styles.assignmentRow}>
                                <Text style={styles.assignmentName}>{childName}</Text>
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`${childName}の割り当てを外す`}
                                  onPress={() => changeChild(driver.availabilityDriverId, direction, childId, false)}
                                  style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                                >
                                  <Text style={styles.removeText}>外す</Text>
                                </Pressable>
                              </View>
                            );
                          }) : <Text style={styles.driverMeta}>子どもは未割り当てです。</Text>}
                          {driver.escorts.length > 0 ? (
                            <Text style={styles.driverMeta}>
                              引率: {driver.escorts.map((escort) =>
                                `${ride.availabilityDrivers.find((item) => item.id === escort.availabilityDriverId)?.guardian.name ?? '不明'}${escort.rideAssignments.length > 0
                                  ? `（子ども: ${escort.rideAssignments.map((item) => ride.children.find((child) => child.id === item.childId)?.name ?? '不明').join('、')}）`
                                  : ''}`
                              ).join('、')}（既存の引率設定を保持）
                            </Text>
                          ) : null}
                          {remaining > 0 && freeChildren.length > 0 ? (
                            <>
                              <AppButton
                                label={openPicker === pickerKey ? '候補を閉じる' : `子どもを追加（残り${remaining}席）`}
                                variant="secondary"
                                onPress={() => setOpenPicker(openPicker === pickerKey ? null : pickerKey)}
                              />
                              {openPicker === pickerKey ? freeChildren.map((child) => (
                                <Pressable
                                  key={child.id}
                                  accessibilityRole="button"
                                  onPress={() => {
                                    changeChild(driver.availabilityDriverId, direction, child.id, true);
                                    setOpenPicker(null);
                                  }}
                                  style={({ pressed }) => [styles.candidateRow, pressed && styles.pressed]}
                                >
                                  <Text style={styles.candidateName}>{child.name}</Text>
                                  <Text style={styles.addText}>追加</Text>
                                </Pressable>
                              )) : null}
                            </>
                          ) : null}
                          {remaining <= 0 ? <Text style={styles.capacityText}>この車は満席です。</Text> : null}
                        </View>
                      );
                    })}
                    {selected.length === 0 ? <Text style={styles.sectionBody}>まだ車を選んでいません。</Text> : null}
                    {candidates.length > 0 ? (
                      <AppButton
                        label={openPicker === `driver:${direction}` ? '候補を閉じる' : '車を追加'}
                        variant="secondary"
                        onPress={() => setOpenPicker(openPicker === `driver:${direction}` ? null : `driver:${direction}`)}
                      />
                    ) : (
                      <Text style={styles.driverMeta}>追加できる車出し回答はありません。</Text>
                    )}
                    {openPicker === `driver:${direction}` ? candidates.map((answer) => (
                      <Pressable
                        key={answer.id}
                        accessibilityRole="button"
                        onPress={() => addDriver(answer.id, direction)}
                        style={({ pressed }) => [styles.candidateRow, pressed && styles.pressed]}
                      >
                        <Text style={styles.candidateName}>{answer.guardian.name}号 · {answer.seats}席</Text>
                        <Text style={styles.addText}>追加</Text>
                      </Pressable>
                    )) : null}
                  </Card>
                );
              })}
            </View>

            <Card style={styles.saveCard}>
              <Text style={styles.sectionTitle}>配車を保存</Text>
              <Text style={styles.sectionBody}>
                {isDirty ? '未保存の変更があります。' : '保存済みの内容を表示しています。'}
              </Text>
              {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
              {saveNotice ? <Text style={styles.successText}>{saveNotice}</Text> : null}
              <AppButton label={isSaving ? '保存中…' : '配車を保存'} onPress={save} disabled={!isDirty || isSaving || needsRefresh} />
              {isDirty ? <AppButton label="変更を破棄" onPress={discardChanges} variant="secondary" disabled={isSaving} /> : null}
              {needsRefresh ? <AppButton label="最新情報を再読み込み" onPress={forceReload} variant="secondary" /> : null}
            </Card>

            <Card style={styles.shareCard}>
              <Text style={styles.sectionTitle}>LINE共有</Text>
              <Text style={styles.sectionBody}>回答依頼と決定後の案内を、共有シートからLINEに送れます。</Text>
              {!isAssignmentComplete ? (
                <Text style={styles.sectionBody}>決定後の案内は、参加する子どもを行き・帰りとも割り当ててから共有できます。</Text>
              ) : null}
              <View style={styles.shareActions}>
                <AppButton label="入力依頼を共有" onPress={() => shareText(requestText)} />
                <AppButton
                  label="決定後の案内を共有"
                  onPress={() => shareText(finalText, true)}
                  variant="secondary"
                  disabled={isDirty || needsRefresh || isSaving || isGenerating || !isAssignmentComplete}
                />
              </View>
            </Card>
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
  answerNotice: {
    gap: 4,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    padding: 12,
  },
  noticeTitle: {
    color: '#9a3412',
    fontSize: 14,
    fontWeight: '800',
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
  assignmentSection: {
    gap: 12,
  },
  directionCard: {
    gap: 12,
  },
  directionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  driverCard: {
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe7e5',
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  driverHeaderText: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  driverMeta: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 22,
  },
  assignmentRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingLeft: 12,
  },
  assignmentName: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  removeButton: {
    minHeight: 44,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  removeText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '800',
  },
  candidateRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#b8d8d4',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 12,
  },
  candidateName: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  addText: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '800',
  },
  capacityText: {
    color: '#9a3412',
    fontSize: 13,
    fontWeight: '700',
  },
  saveCard: {
    gap: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  successText: {
    color: '#0f766e',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
