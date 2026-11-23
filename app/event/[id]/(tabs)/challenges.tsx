import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { listChallengeItems } from '../../../../src/api/challenges';
import { AppButton } from '../../../../src/components/AppButton';
import { Banner } from '../../../../src/components/Banner';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ListRow } from '../../../../src/components/ListRow';
import { useEventId } from '../../../../src/hooks/useEventId';
import { useSession } from '../../../../src/hooks/useSession';
import { photoCountLabel } from '../../../../src/lib/challenges';
import type { ChallengeItem } from '../../../../src/lib/challenges';
import { colors, radii, spacing } from '../../../../src/theme';

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
          <EmptyState icon="cloud-offline-outline" title={error}>
            <AppButton title="Try again" variant="secondary" onPress={() => void load()} />
          </EmptyState>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.id}
      style={styles.listView}
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
        error ? <Banner kind="error" text={`${error} Pull down to retry.`} /> : undefined
      }
      ListEmptyComponent={
        <EmptyState icon="trophy-outline" title="No challenges yet.">
          <Text style={styles.muted}>The host can add some in Event info.</Text>
        </EmptyState>
      }
      renderItem={({ item }) => (
        <View style={styles.rowWrap}>
          <ListRow
            last
            title={item.title}
            subtitle={item.description ?? undefined}
            note={photoCountLabel(item.photoCount)}
            accessibilityLabel={`Open challenge ${item.title}`}
            right={
              item.submitted ? (
                <Ionicons
                  name="checkmark-circle"
                  size={26}
                  color={colors.success}
                  accessibilityLabel="Done"
                />
              ) : undefined
            }
            onPress={() =>
              router.push({
                pathname: '/event/[id]/challenge/[challengeId]',
                params: { id, challengeId: item.id },
              })
            }
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  listView: { backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.sm },
  emptyContainer: { flexGrow: 1 },
  rowWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  muted: { color: colors.secondaryText, fontSize: 16, textAlign: 'center' },
});
