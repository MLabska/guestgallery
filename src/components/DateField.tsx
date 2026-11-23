import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatLongDate, parseIsoDate, toIsoDate } from '../lib/dates';
import { colors, MIN_TAP, radii, spacing, typography } from '../theme';

type Props = {
  label?: string;
  /** YYYY-MM-DD, or null when nothing is chosen (optional date, e.g. the gallery filter). */
  value: string | null;
  onChange: (iso: string) => void;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
};

/**
 * Date chosen from a calendar, never typed (SPEC 1.1, 4.4). Shows the chosen date as a field; a tap
 * opens the inline calendar on iOS (Expo Go) or the system dialog on Android.
 */
export function DateField({ label, value, onChange, placeholder = 'Choose a date', error, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const date = (value ? parseIsoDate(value) : null) ?? new Date();

  function onPress() {
    if (disabled) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) onChange(toIsoDate(picked));
        },
      });
      return;
    }
    setOpen((o) => !o);
  }

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${value ? formatLongDate(value) : placeholder}` : undefined}
        style={[styles.field, error ? styles.fieldError : null, disabled && styles.disabled]}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.accent} />
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? formatLongDate(value) : placeholder}
        </Text>
      </Pressable>
      {Platform.OS === 'ios' && open ? (
        <View style={styles.calendar}>
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            accentColor={colors.accent}
            onChange={(_event, picked) => {
              if (picked) onChange(toIsoDate(picked));
            }}
          />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: {
    ...typography.label,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: {
    minHeight: MIN_TAP + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fieldError: { borderColor: colors.danger },
  disabled: { opacity: 0.5 },
  value: { fontSize: 16, color: colors.text, flex: 1 },
  placeholder: { color: colors.placeholder },
  calendar: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  error: { ...typography.caption, color: colors.danger },
});
