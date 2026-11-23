import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

type Kind = 'info' | 'error' | 'warning';

const kinds = {
  info: { bg: colors.infoSoft, fg: colors.accent, icon: 'information-circle' },
  error: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' },
  warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'cloud-offline' },
} as const;

/** Inline message strip for info, error and warning texts. */
export function Banner({
  kind = 'info',
  text,
  style,
}: {
  kind?: Kind;
  text: string;
  style?: StyleProp<ViewStyle>;
}) {
  const k = kinds[kind];
  return (
    <View style={[styles.box, { backgroundColor: k.bg }, style]}>
      <Ionicons name={k.icon} size={20} color={k.fg} />
      <Text style={[styles.text, { color: k.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.sm,
  },
  text: { ...typography.bodyStrong, fontSize: 15, flex: 1 },
});
