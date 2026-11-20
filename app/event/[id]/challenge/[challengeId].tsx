import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getChallenge } from '../../../../src/api/challenges';
import { PhotoGrid } from '../../../../src/components/PhotoGrid';
import { useEvent } from '../../../../src/hooks/useEvent';
import { useEventId } from '../../../../src/hooks/useEventId';
import { useEventPhotosState } from '../../../../src/hooks/useEventPhotos';
import type { Challenge } from '../../../../src/lib/challenges';
import { UPLOADS_CLOSED_MESSAGE } from '../../../../src/lib/uploadErrors';
import { uploadsOpen } from '../../../../src/lib/uploadWindow';

const CHALLENGE_RECHECK_MS = 15000;

// Challenge gallery (SPEC 5.3, 5.2): live grid of one challenge's photos and a button that opens
// the camera with the challenge pre-selected.
export default function ChallengeGallery() {
  const id = useEventId();
  const router = useRouter();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const gallery = useEventPhotosState(id, challengeId);
  const insets = useSafeAreaInsets();
  const { event, refresh } = useEvent(id);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [gone, setGone] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadChallenge = useCallback(() => {
    getChallenge(challengeId)
      .then((c) => {
        setChallenge(c);
        setGone(c === null);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, [challengeId]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  // Photos leaving the list (deleted, or detached because the challenge was deleted): re-check it.
  const photoCount = gallery.photos.length;
  const previousCount = useRef(photoCount);
  useEffect(() => {
    if (photoCount < previousCount.current) loadChallenge();
    previousCount.current = photoCount;
  }, [photoCount, loadChallenge]);

  // Re-read the upload window when coming back from the camera / upload screens. While the screen
  // is focused the challenge is also re-checked now and then: a challenge deleted by the host has
  // no photo to leave the list, so an empty challenge gets no realtime signal.
  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(loadChallenge, CHALLENGE_RECHECK_MS);
      return () => clearInterval(timer);
    }, [refresh, loadChallenge]),
  );

  if (gone) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: 'Challenge' }} />
        <Text style={styles.muted}>This challenge no longer exists.</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const open = event ? uploadsOpen(event.uploads_close_at) : false;
  const takePhoto = () =>
    router.push({ pathname: '/event/[id]/camera', params: { id, challengeId } });

  const header = (
    <View style={styles.header}>
      {challenge?.description ? <Text style={styles.muted}>{challenge.description}</Text> : null}
      {loadError && !challenge ? (
        <Button title="Could not load the challenge. Try again" onPress={loadChallenge} />
      ) : null}
      {event && !open ? <Text style={styles.closed}>{UPLOADS_CLOSED_MESSAGE}</Text> : null}
      {gallery.error && gallery.photos.length > 0 ? (
        <Text style={styles.offline}>
          No connection - showing the last loaded photos. Pull down to retry.
        </Text>
      ) : null}
    </View>
  );

  const empty = gallery.loading ? (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  ) : (
    <View style={styles.center}>
      <Text style={styles.muted}>
        {gallery.error
          ? 'Could not load photos. Pull down to retry.'
          : 'No photos for this challenge yet.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ headerShown: true, title: challenge?.title ?? 'Challenge' }} />
      <PhotoGrid
        photos={gallery.photos}
        urls={gallery.urls}
        refreshing={gallery.refreshing}
        onRefresh={() => {
          refresh();
          loadChallenge();
          void gallery.refresh();
        }}
        onEndReached={() => void gallery.loadMore()}
        onOpen={(photo) =>
          router.push({
            pathname: '/event/[id]/photo/[photoId]',
            params: { id, photoId: photo.id, challengeId },
          })
        }
        onImageError={gallery.reportImageError}
        header={header}
        empty={empty}
        insetForHeader
      />
      {/* Primary action in a bottom bar, clear of the header and the home indicator. */}
      {open ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button title="Take photo for this challenge" onPress={takePhoto} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  header: { padding: 12, gap: 8 },
  bottomBar: {
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
  muted: { color: '#666', textAlign: 'center' },
  offline: { color: '#8a6d00', textAlign: 'center', fontWeight: '600' },
  closed: { color: '#b00020', textAlign: 'center', fontWeight: '600' },
});
