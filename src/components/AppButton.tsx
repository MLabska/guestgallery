import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, MIN_TAP, radii, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'onMedia';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Rounded-rectangle button. Loading and disabled both ignore presses. */
export function AppButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: Props) {
  const inactive = disabled || loading;
  const v = variants[variant];
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        v.container,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={v.text.color} /> : null}
          <Text style={[styles.text, v.text]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const variants = {
  primary: {
    container: { backgroundColor: colors.accent },
    text: { color: colors.onAccent },
  },
  secondary: {
    container: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.accent },
    text: { color: colors.accent },
  },
  danger: {
    container: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.danger },
    text: { color: colors.danger },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.accent },
  },
  onMedia: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.onMedia },
  },
} as const;

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TAP + 4,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: { fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
});
