import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listMyEvents } from '../src/api/events';
import { AppButton } from '../src/components/AppButton';
import { EmptyState } from '../src/components/EmptyState';
import { ListRow } from '../src/components/ListRow';
import { useSession } from '../src/hooks/useSession';
import type { MyEventItem } from '../src/lib/myEvents';
import { colors, radii, spacing } from '../src/theme';

// Home: my events, newest first, marked Host or Guest (SPEC 1.4).
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const userId = session?.user.id;
  const [events, setEvents] = useState<MyEventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setEvents(await listMyEvents(userId));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load your events');
    }
  }, [userId]);

  // Reload whenever the screen comes into focus (e.g. back from Create event).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      {error && (
        <EmptyState icon="cloud-offline-outline" title={error}>
          <AppButton title="Try again" variant="secondary" onPress={() => void load()} />
        </EmptyState>
      )}
      {!error && events === null && (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      )}
      {!error && events !== null && (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          style={styles.listView}
          contentContainerStyle={events.length === 0 ? styles.emptyList : styles.list}
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <EmptyState
              icon="images-outline"
              title="You have no events yet. Create one to get started."
            />
          }
          renderItem={({ item }) => (
            <View style={styles.rowWrap}>
              <ListRow
                last
                title={item.name}
                subtitle={`${item.eventDate} · Code ${item.code}`}
                detail={item.role}
                onPress={() => router.push(`/event/${item.id}`)}
              />
            </View>
          )}
        />
      )}
      {/* Primary action in a bottom bar, clear of the header, notch and home indicator. */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <AppButton title="Create event" icon="add-circle-outline" onPress={() => router.push('/create')} />
        <AppButton
          title="Join event"
          icon="qr-code-outline"
          variant="secondary"
          onPress={() => router.push('/join/scan')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listView: { flex: 1 },
  bottomBar: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  loader: { flex: 1, marginTop: spacing.xl },
  list: { gap: spacing.sm, padding: spacing.lg },
  emptyList: { flexGrow: 1, padding: spacing.lg },
  rowWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
