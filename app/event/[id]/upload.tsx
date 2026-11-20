import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Button, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { uploadPhoto } from '../../../src/api/photos';
import { useEvent } from '../../../src/hooks/useEvent';
import { useEventId } from '../../../src/hooks/useEventId';
import { useSession } from '../../../src/hooks/useSession';
import { UPLOADS_CLOSED_MESSAGE, uploadErrorMessage } from '../../../src/lib/uploadErrors';
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
// photos. The optional challenge picker (SPEC 5.2) arrives with step 7; a challengeId param is
// already passed through to the insert.
export default function UploadScreen() {
  const id = useEventId();
  const router = useRouter();
  const { session } = useSession();
  const { uris, source, challengeId } = useLocalSearchParams<{
    uris?: string;
    source?: string;
    challengeId?: string;
  }>();
  const { event, loading, error, reload } = useEvent(id);

  const [items, setItems] = useState<UploadItem[]>(() => createItems(parseUris(uris)));
  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [closed, setClosed] = useState(false);
  const itemsRef = useRef(items);
  const runningRef = useRef(false);

  const finished = started && !running && isFinished(items);
  const failed = failedCount(items);
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
        <ActivityIndicator />
      </View>
    );
  }

  if (!event && !started) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {error ?? 'Event not found'}. Check your connection and try again.
        </Text>
        <Button title="Retry" onPress={reload} />
        <Button title="Back to gallery" onPress={backToGallery} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No photos selected.</Text>
        <Button title="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  if (!open && !started) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{UPLOADS_CLOSED_MESSAGE}</Text>
        <Button title="Back to gallery" onPress={backToGallery} />
      </View>
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
      <View style={styles.footer}>
        {started && <Text style={styles.progress}>{progressLabel(items)}</Text>}
        {!started && (
          <>
            <Button
              title={single ? 'Upload photo' : `Upload ${items.length} photos`}
              onPress={() => void start(items)}
            />
            {source === 'camera' ? (
              <Button
                title="Retake"
                onPress={() =>
                  router.replace({
                    pathname: '/event/[id]/camera',
                    params: { id, ...(challengeId ? { challengeId } : {}) },
                  })
                }
              />
            ) : (
              <Button title="Cancel" onPress={() => router.back()} />
            )}
          </>
        )}
        {running && <ActivityIndicator />}
        {finished && failed > 0 && !closed && (
          <Button
            title={failed === 1 ? 'Retry failed photo' : 'Retry failed photos'}
            onPress={retryFailed}
          />
        )}
        {finished && <Button title="Done" onPress={backToGallery} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  error: { color: '#b00020', textAlign: 'center', fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  row: { gap: 6 },
  big: { width: '100%', aspectRatio: 3 / 4, borderRadius: 8, backgroundColor: '#eee' },
  thumb: { width: '100%', height: 140, borderRadius: 8, backgroundColor: '#eee' },
  statusText: { color: '#555' },
  footer: { padding: 16, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  progress: { textAlign: 'center', fontWeight: '600' },
});
