import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listMyEvents } from '../src/api/events';
import { useSession } from '../src/hooks/useSession';
import type { MyEventItem } from '../src/lib/myEvents';

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
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
          <Button title="Try again" onPress={() => void load()} />
        </View>
      )}
      {!error && events === null && <ActivityIndicator style={styles.loader} />}
      {!error && events !== null && (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          style={styles.listView}
          contentContainerStyle={styles.list}
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <Text style={styles.empty}>
              You have no events yet. Create one to get started.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/event/${item.id}`)}
              accessibilityRole="button"
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.eventDate} · Code {item.code}
                </Text>
              </View>
              <Text style={item.role === 'Host' ? styles.badgeHost : styles.badgeGuest}>
                {item.role}
              </Text>
            </Pressable>
          )}
        />
      )}
      {/* Primary action in a bottom bar, clear of the header, notch and home indicator. */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title="Create event" onPress={() => router.push('/create')} />
        <Button title="Join event" onPress={() => router.push('/join/scan')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listView: { flex: 1 },
  bottomBar: {
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
  centered: { flex: 1, alignItems: 'center', gap: 8, marginTop: 24, padding: 16 },
  loader: { flex: 1, marginTop: 24 },
  list: { gap: 8, padding: 16 },
  empty: { textAlign: 'center', color: '#666', marginTop: 24 },
  error: { color: '#b00020', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f2f2f7',
    gap: 8,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  rowMeta: { color: '#666' },
  badgeHost: { fontWeight: '700', color: '#0a58ca' },
  badgeGuest: { fontWeight: '600', color: '#555' },
});
