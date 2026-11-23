import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import { colors, spacing, typography } from '../theme';

type Props = { children: ReactNode; style?: StyleProp<TextStyle> };

/** Large bold screen heading. */
export function ScreenTitle({ children, style }: Props) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

/** Small uppercase section label. */
export function SectionHeader({ children, style }: Props) {
  return <Text style={[styles.section, style]}>{children}</Text>;
}

/** Secondary (grey) body text. */
export function MutedText({ children, style }: Props) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: { ...typography.largeTitle, color: colors.text },
  section: {
    ...typography.label,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  muted: { ...typography.body, color: colors.secondaryText },
});
