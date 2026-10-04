import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';

export function useUnsavedForm(hasChanges: boolean, isSubmitting: boolean) {
  const navigation = useNavigation();
  const saved = useRef(false);

  usePreventRemove(hasChanges || isSubmitting, ({ data }) => {
    if (saved.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (isSubmitting) {
      if (Platform.OS === 'web') window.alert('保存中です。完了するまでお待ちください。');
      else Alert.alert('保存中です', '完了するまでお待ちください。');
      return;
    }
    if (Platform.OS === 'web') {
      if (window.confirm('入力内容はまだ保存されていません。破棄して戻りますか？')) navigation.dispatch(data.action);
      return;
    }
    Alert.alert('入力内容を破棄しますか？', 'まだ保存されていない入力内容があります。', [
      { text: '入力を続ける', style: 'cancel' },
      { text: '破棄して戻る', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || (!hasChanges && !isSubmitting)) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (saved.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasChanges, isSubmitting]);

  return () => { saved.current = true; };
}
