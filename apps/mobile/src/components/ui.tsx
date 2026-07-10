import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

export function ScreenHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.header}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' ? styles.secondaryButton : styles.primaryButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={variant === 'secondary' ? styles.secondaryButtonText : styles.primaryButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

export function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <View style={compact ? styles.compactLoading : styles.loading}>
      <ActivityIndicator color="#0f766e" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} variant="secondary" style={styles.emptyButton} />
      ) : null}
    </Card>
  );
}

export const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  description: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe7e5',
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: '#0f766e',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#b8d8d4',
    backgroundColor: '#ffffff',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.5,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  compactLoading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    gap: 8,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyBody: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 10,
  },
});
