import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  /** Extra text under the subtitle. */
  note?: string;
  /** Small accent text on the right (e.g. a role badge). */
  detail?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
  accessibilityLabel?: string;
};

/** List row with a thin divider and an optional chevron (iOS style). */
export function ListRow({
  title,
  subtitle,
  note,
  detail,
  right,
  onPress,
  chevron = true,
  last = false,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {note ? <Text style={styles.subtitle}>{note}</Text> : null}
      </View>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {right}
      {onPress && chevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
      ) : null}
    </Pressable>
  );
}

/** White grouped container for ListRows. */
export function ListGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.background },
  text: { flex: 1, gap: 2 },
  title: { ...typography.callout, color: colors.text },
  subtitle: { ...typography.caption, color: colors.secondaryText },
  detail: { ...typography.label, color: colors.accent },
});
