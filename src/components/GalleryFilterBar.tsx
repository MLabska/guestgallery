import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { filterLabel, isFilterActive, NO_FILTER } from '../lib/galleryFilter';
import type { GalleryFilter } from '../lib/galleryFilter';
import type { Participant } from '../lib/participants';
import { colors, MIN_TAP, radii, spacing, typography } from '../theme';
import { AppButton } from './AppButton';
import { DateField } from './DateField';
import { ListGroup, ListRow } from './ListRow';
import { Sheet } from './Sheet';
import { SectionHeader } from './Typography';

type Props = {
  filter: GalleryFilter;
  onChange: (filter: GalleryFilter) => void;
  /** People for the person picker (SPEC 4.4, the participants list of 1.5). */
  participants: Participant[];
  /** Set when the participants could not be loaded; the day filter still works. */
  participantsError?: boolean;
};

/**
 * Filter button above the grid. The active filter is shown next to it with a one-tap clear
 * (SPEC 4.4). The sheet picks one person and/or one day.
 */
export function GalleryFilterBar({ filter, onChange, participants, participantsError }: Props) {
  const [open, setOpen] = useState(false);
  const active = isFilterActive(filter);
  const label = filterLabel(filter, (id) => participants.find((p) => p.user_id === id)?.nickname ?? null);

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Filter photos"
        style={[styles.button, active && styles.buttonActive]}
      >
        <Ionicons name="filter" size={18} color={active ? colors.onAccent : colors.accent} />
        <Text style={[styles.buttonText, active && styles.buttonTextActive]}>Filter</Text>
      </Pressable>
      {active ? (
        <View style={styles.active}>
          <Text style={styles.activeText} numberOfLines={1} accessibilityLabel={`Active filter: ${label}`}>
            {label}
          </Text>
          <Pressable
            onPress={() => onChange(NO_FILTER)}
            accessibilityRole="button"
            accessibilityLabel="Clear filter"
            hitSlop={10}
          >
            <Ionicons name="close-circle" size={22} color={colors.secondaryText} />
          </Pressable>
        </View>
      ) : null}

      <Sheet visible={open} title="Filter photos" onClose={() => setOpen(false)}>
        <View style={styles.group}>
          <SectionHeader>Person</SectionHeader>
          {participantsError ? (
            <Text style={styles.muted}>Could not load the guest list.</Text>
          ) : (
            <ListGroup>
              <ListRow
                title="Everyone"
                chevron={false}
                last={participants.length === 0}
                right={
                  filter.uploaderId === null ? (
                    <Ionicons name="checkmark" size={22} color={colors.accent} />
                  ) : undefined
                }
                onPress={() => onChange({ ...filter, uploaderId: null })}
              />
              {participants.map((p, i) => (
                <ListRow
                  key={p.user_id}
                  title={p.nickname}
                  chevron={false}
                  last={i === participants.length - 1}
                  right={
                    filter.uploaderId === p.user_id ? (
                      <Ionicons name="checkmark" size={22} color={colors.accent} />
                    ) : undefined
                  }
                  onPress={() => onChange({ ...filter, uploaderId: p.user_id })}
                />
              ))}
            </ListGroup>
          )}
        </View>
        <View style={styles.group}>
          <SectionHeader>Day</SectionHeader>
          <DateField
            value={filter.day}
            placeholder="Any day"
            onChange={(day) => onChange({ ...filter, day })}
          />
          {filter.day ? (
            <AppButton
              title="Any day"
              variant="ghost"
              onPress={() => onChange({ ...filter, day: null })}
            />
          ) : null}
        </View>
        <View style={styles.group}>
          {active ? (
            <AppButton title="Clear filter" variant="secondary" onPress={() => onChange(NO_FILTER)} />
          ) : null}
          <AppButton title="Done" onPress={() => setOpen(false)} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  button: {
    minHeight: MIN_TAP - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  buttonActive: { backgroundColor: colors.accent },
  buttonText: { ...typography.bodyStrong, color: colors.accent },
  buttonTextActive: { color: colors.onAccent },
  active: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TAP - 8,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
  },
  activeText: { ...typography.caption, color: colors.accent, flex: 1, fontWeight: '600' },
  group: { gap: spacing.sm },
  muted: { ...typography.body, color: colors.secondaryText },
});
