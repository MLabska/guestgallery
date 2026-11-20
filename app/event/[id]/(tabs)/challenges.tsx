import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { listChallengeItems } from '../../../../src/api/challenges';
import { useEventId } from '../../../../src/hooks/useEventId';
import { useSession } from '../../../../src/hooks/useSession';
import { photoCountLabel } from '../../../../src/lib/challenges';
import type { ChallengeItem } from '../../../../src/lib/challenges';

// Challenges tab (SPEC 5.3): title, number of submissions and a check mark for challenges
// I already submitted to. Reloaded whenever the tab gains focus and on pull-to-refresh.
export default function ChallengesTab() {
  const id = useEventId();
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const [items, setItems] = useState<ChallengeItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setItems(await listChallengeItems(id, userId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load challenges');
    }
  }, [id, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!items) {
    return (
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <Button title="Try again" onPress={() => void load()} />
          </>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load().finally(() => setRefreshing(false));
          }}
        />
      }
      ListHeaderComponent={
        error ? <Text style={styles.error}>{error} Pull down to retry.</Text> : undefined
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.muted}>No challenges yet.</Text>
          <Text style={styles.muted}>The host can add some in Event info.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: '/event/[id]/challenge/[challengeId]',
              params: { id, challengeId: item.id },
            })
          }
          accessibilityLabel={`Open challenge ${item.title}`}
        >
          <View style={styles.cardText}>
            <Text style={styles.title}>{item.title}</Text>
            {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
            <Text style={styles.muted}>{photoCountLabel(item.photoCount)}</Text>
          </View>
          {item.submitted && (
            <Text style={styles.check} accessibilityLabel="Done">
              ✓
            </Text>
          )}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  list: { padding: 12, gap: 10 },
  emptyContainer: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  cardText: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600' },
  muted: { color: '#666' },
  check: { fontSize: 26, color: '#1a7f37', fontWeight: '700' },
  error: { color: '#b00020', textAlign: 'center' },
});
