import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenHeader } from '@/components/ui';

export function AuthForm({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <SafeAreaView style={authStyles.screen} edges={['bottom']}>
      <KeyboardAvoidingView style={authStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={authStyles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title={title} description={description} />
          <Card style={authStyles.card}>{children}</Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthInput({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <>
      <Text style={authStyles.label}>{label}</Text>
      <TextInput {...props} accessibilityLabel={label} autoCapitalize="none" autoCorrect={false} placeholderTextColor="#94a3b8" style={authStyles.input} />
    </>
  );
}

export const authStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40, gap: 24 },
  card: { gap: 12 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700' },
  input: { minHeight: 48, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', color: '#0f172a', fontSize: 16 },
  body: { fontSize: 14, lineHeight: 22, color: '#64748b' },
  error: { fontSize: 14, lineHeight: 22, color: '#b91c1c' },
});
