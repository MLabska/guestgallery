import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listChallenges } from '../../../src/api/challenges';
import { uploadPhoto } from '../../../src/api/photos';
import { AppButton } from '../../../src/components/AppButton';
import { EmptyState } from '../../../src/components/EmptyState';
import { useEvent } from '../../../src/hooks/useEvent';
import { useEventId } from '../../../src/hooks/useEventId';
import { useSession } from '../../../src/hooks/useSession';
import type { Challenge } from '../../../src/lib/challenges';
import {
  CHALLENGE_GONE_MESSAGE,
  UPLOADS_CLOSED_MESSAGE,
  uploadErrorMessage,
} from '../../../src/lib/uploadErrors';
import {
  createItems,
  failedCount,
  isFinished,
  progressLabel,
  resetFailed,
  runUploads,
  type UploadItem,
} from '../../../src/lib/uploadQueue';
import { uploadsOpen } from '../../../src/lib/uploadWindow';
import { colors, radii, spacing } from '../../../src/theme';

function parseUris(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

// Upload preview (SPEC 3.1, 3.2): Upload / Retake, progress "Uploading 3 / 10", retry of failed
// photos, and an optional challenge picker (SPEC 5.2). A challengeId param pre-selects a challenge.
export default function UploadScreen() {
  const id = useEventId();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { uris, source, challengeId: presetChallengeId } = useLocalSearchParams<{
    uris?: string;
    source?: string;
    challengeId?: string;
  }>();
  const { event, loading, error, reload } = useEvent(id);

  const [items, setItems] = useState<UploadItem[]>(() => createItems(parseUris(uris)));
  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [closed, setClosed] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeId, setChallengeId] = useState<string | null>(presetChallengeId ?? null);
  const itemsRef = useRef(items);
  const runningRef = useRef(false);

  const finished = started && !running && isFinished(items);
  const failed = failedCount(items);
  useEffect(() => {
    listChallenges(id)
      .then((list) => {
        setChallenges(list);
        // A pre-selected challenge deleted since the camera was opened is not sent.
        setChallengeId((current) => (current && list.some((c) => c.id === current) ? current : null));
      })
      .catch(() => undefined); // The picker is optional: without the list the photo goes untagged.
  }, [id]);

  const open = event ? uploadsOpen(event.uploads_close_at) && !closed : false;

  async function start(list: UploadItem[]) {
    const userId = session?.user.id;
    if (!userId || runningRef.current) return;
    runningRef.current = true;
    setStarted(true);
    setRunning(true);
    const result = await runUploads(
      list,
      async (item) => {
        await uploadPhoto({ eventId: id, userId, uri: item.uri, challengeId });
      },
      (next) => {
        itemsRef.current = next;
        setItems(next);
      },
      (e) => uploadErrorMessage(e instanceof Error ? e.message : undefined),
    );
    runningRef.current = false;
    setRunning(false);
    if (result.some((i) => i.error === UPLOADS_CLOSED_MESSAGE)) setClosed(true);
    if (result.some((i) => i.error === CHALLENGE_GONE_MESSAGE)) {
      // The host deleted the challenge: further tries (Retry) go without a challenge.
      setChallengeId(null);
      listChallenges(id)
        .then(setChallenges)
        .catch(() => undefined);
    }
    if (result.some((i) => i.status === 'done')) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  function retryFailed() {
    const next = resetFailed(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
    void start(next);
  }

  function backToGallery() {
    router.dismissTo(`/event/${id}`);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!event && !started) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title={`${error ?? 'Event not found'}. Check your connection and try again.`}
      >
        <AppButton title="Retry" onPress={reload} />
        <AppButton title="Back to gallery" variant="secondary" onPress={backToGallery} />
      </EmptyState>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState icon="images-outline" title="No photos selected.">
        <AppButton title="Go back" variant="secondary" onPress={() => router.back()} />
      </EmptyState>
    );
  }

  if (!open && !started) {
    return (
      <EmptyState icon="lock-closed-outline" title={UPLOADS_CLOSED_MESSAGE}>
        <AppButton title="Back to gallery" variant="secondary" onPress={backToGallery} />
      </EmptyState>
    );
  }

  const single = items.length === 1;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => (
          <View key={item.key} style={styles.row}>
            <Image source={{ uri: item.uri }} style={single ? styles.big : styles.thumb} />
            {started && (
              <Text style={styles.statusText}>
                {item.status === 'done' && 'Uploaded'}
                {item.status === 'uploading' && 'Uploading...'}
                {item.status === 'pending' && 'Waiting'}
                {item.status === 'failed' && (item.error ?? 'Failed')}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {started && <Text style={styles.progress}>{progressLabel(items)}</Text>}
        {!started && challenges.length > 0 && (
          <View style={styles.picker}>
            <Text style={styles.pickerLabel}>Submit to a challenge (optional)</Text>
            <View style={styles.chips}>
              {challenges.map((c) => {
                const selected = c.id === challengeId;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setChallengeId(selected ? null : c.id)}
                    accessibilityLabel={`Challenge ${c.title}`}
                    accessibilityState={{ selected }}
                  >
                    <Text style={selected ? styles.chipTextSelected : styles.chipText}>
                      {selected ? '✓ ' : ''}
                      {c.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        {!started && (
          <>
            <AppButton
              title={single ? 'Upload photo' : `Upload ${items.length} photos`}
              icon="cloud-upload-outline"
              onPress={() => void start(items)}
            />
            {source === 'camera' ? (
              <AppButton
                title="Retake"
                variant="secondary"
                onPress={() =>
                  router.replace({
                    pathname: '/event/[id]/camera',
                    params: { id, ...(challengeId ? { challengeId } : {}) },
                  })
                }
              />
            ) : (
              <AppButton title="Cancel" variant="secondary" onPress={() => router.back()} />
            )}
          </>
        )}
        {running && <ActivityIndicator color={colors.accent} />}
        {finished && failed > 0 && !closed && (
          <AppButton
            title={failed === 1 ? 'Retry failed photo' : 'Retry failed photos'}
            icon="refresh"
            onPress={retryFailed}
          />
        )}
        {finished && <AppButton title="Done" variant={failed > 0 ? 'secondary' : 'primary'} onPress={backToGallery} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.md },
  row: { gap: spacing.sm },
  big: { width: '100%', aspectRatio: 3 / 4, borderRadius: radii.md, backgroundColor: colors.border },
  thumb: { width: '100%', height: 140, borderRadius: radii.md, backgroundColor: colors.border },
  statusText: { color: colors.secondaryText },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  progress: { textAlign: 'center', fontWeight: '600', color: colors.text, fontSize: 16 },
  picker: { gap: spacing.sm },
  pickerLabel: { fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipSelected: { backgroundColor: colors.accent },
  chipText: { color: colors.accent },
  chipTextSelected: { color: colors.onAccent, fontWeight: '600' },
});
