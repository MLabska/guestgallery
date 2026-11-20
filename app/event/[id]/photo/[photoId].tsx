import { Image } from 'expo-image';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deletePhoto, fetchChallengeTitles, fetchPhoto, signedUrls } from '../../../../src/api/photos';
import { savePhotoToLibrary } from '../../../../src/api/savePhoto';
import { useEventId } from '../../../../src/hooks/useEventId';
import { useEvent } from '../../../../src/hooks/useEvent';
import { useEventPhotos, useEventPhotosState } from '../../../../src/hooks/useEventPhotos';
import { useIsHost } from '../../../../src/hooks/useIsHost';
import { useSession } from '../../../../src/hooks/useSession';
import { canDeletePhoto, deleteErrorMessage } from '../../../../src/lib/photoDelete';
import { formatPhotoTime, isNearEnd } from '../../../../src/lib/photoList';
import type { GalleryPhoto } from '../../../../src/lib/photoList';

// Full-screen viewer (SPEC 4.2, 4.3). Swipe left/right moves through the gallery list; when opened
// from a challenge gallery (challengeId param) it moves through that challenge's photos instead.
export default function PhotoViewer() {
  const { challengeId } = useLocalSearchParams<{ challengeId?: string }>();
  return challengeId ? <ChallengeViewer challengeId={challengeId} /> : <GalleryViewer />;
}

function GalleryViewer() {
  const { photos, loading, loadMore } = useEventPhotos();
  return <Viewer photos={photos} listLoading={loading} loadMore={loadMore} />;
}

function ChallengeViewer({ challengeId }: { challengeId: string }) {
  const eventId = useEventId();
  const { photos, loading, loadMore } = useEventPhotosState(eventId, challengeId);
  return <Viewer photos={photos} listLoading={loading} loadMore={loadMore} />;
}

const EXTRA_RECHECK_MS = 5000;

function Viewer({
  photos: listPhotos,
  listLoading,
  loadMore,
}: {
  photos: GalleryPhoto[];
  listLoading: boolean;
  loadMore: () => Promise<void>;
}) {
  const eventId = useEventId();
  const { photoId } = useLocalSearchParams<{ photoId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [currentId, setCurrentId] = useState<string>(photoId);
  // A photo that is not in the loaded list but still exists (outside the first page, pushed out of
  // the list by a refresh, or detached from its challenge) is fetched on its own and shown alone.
  const [extra, setExtra] = useState<GalleryPhoto | null>(null);
  const [recheck, setRecheck] = useState(0);
  const inList = listPhotos.some((p) => p.id === currentId);
  const photos = useMemo(
    () => (!inList && extra && extra.id === currentId ? [extra] : listPhotos),
    [inList, extra, currentId, listPhotos],
  );
  const listRef = useRef<FlatList<GalleryPhoto>>(null);

  const [titles, setTitles] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { session } = useSession();
  const { event, error: eventError, reload: reloadEvent } = useEvent(eventId);
  const isHost = useIsHost(event);
  const [fullUrls, setFullUrls] = useState<Record<string, string>>({});
  // Id of the photo that is being closed/deleted by this viewer (no "deleted" alert for it). Scoped
  // to one photo so that swiping to another photo afterwards is not affected.
  const closingRef = useRef<string | null>(null);
  // Id of a photo whose delete may or may not have gone through (response lost, read-back failed).
  const unknownDeleteRef = useRef<string | null>(null);
  const lastForcedRef = useRef<Record<string, number>>({});
  // router.back() must run at most once per viewer instance, and never after the viewer was left.
  const leftRef = useRef(false);
  const eventRetriedRef = useRef(false);

  useEffect(() => {
    leftRef.current = false;
    return () => {
      leftRef.current = true;
    };
  }, []);

  function leave() {
    if (leftRef.current) return;
    leftRef.current = true;
    router.back();
  }

  // No swipe-back while a delete is in flight.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !deleting });
  }, [navigation, deleting]);

  // The host check needs the event: retry once if loading it failed (e.g. opened while offline).
  useEffect(() => {
    if (eventError && !eventRetriedRef.current) {
      eventRetriedRef.current = true;
      reloadEvent();
    }
  }, [eventError, reloadEvent]);

  // The current photo is not in the list: opened from beyond the first page, pushed out of the list
  // (refresh), detached from its challenge, or deleted. Ask the server which one it is, and only
  // announce "deleted" when the photo really is gone (DESIGN.md section 9).
  useEffect(() => {
    if (inList) return;
    if (listLoading) return;
    if (unknownDeleteRef.current === currentId) {
      // We already told the user the delete outcome is unknown; no second alert.
      closingRef.current = currentId;
      leave();
      return;
    }
    if (closingRef.current === currentId || extra?.id === currentId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    fetchPhoto(currentId)
      .then((found) => {
        if (cancelled || closingRef.current === currentId) return;
        if (found) {
          setExtra(found);
          return;
        }
        closingRef.current = currentId;
        Alert.alert('This photo was deleted');
        leave();
      })
      .catch(() => {
        // Offline: stay on the spinner (Close works) and ask again shortly.
        if (!cancelled) timer = setTimeout(() => setRecheck((n) => n + 1), 3000);
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listLoading, inList, currentId, extra, recheck]);

  // A photo shown alone (outside the loaded list) gets no realtime signal: re-check it now and then.
  useEffect(() => {
    if (inList || !extra || extra.id !== currentId) return;
    let cancelled = false;
    const timer = setInterval(() => {
      fetchPhoto(currentId)
        .then((found) => {
          if (cancelled || found || leftRef.current) return;
          if (closingRef.current === currentId || unknownDeleteRef.current === currentId) {
            // Our own delete (or one we already reported as unknown): close without an alert.
            closingRef.current = currentId;
            leave();
            return;
          }
          closingRef.current = currentId;
          Alert.alert('This photo was deleted');
          leave();
        })
        .catch(() => undefined); // offline: try again at the next tick
    }, EXTRA_RECHECK_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inList, extra, currentId]);

  const index = photos.findIndex((p) => p.id === currentId);
  const current = index >= 0 ? photos[index] : null;
  useEffect(() => {
    fetchChallengeTitles(eventId)
      .then(setTitles)
      .catch(() => undefined);
  }, [eventId]);

  // Swiping near the end of the loaded list loads the next (older) page.
  useEffect(() => {
    if (inList && isNearEnd(index, photos.length)) void loadMore();
  }, [inList, index, photos.length, loadMore]);

  // A realtime insert or delete shifts indexes: keep the page of the current photo in view.
  useEffect(() => {
    if (index >= 0) listRef.current?.scrollToIndex({ index, animated: false });
  }, [index]);

  const ensureUrl = useCallback(async (photo: GalleryPhoto, force = false) => {
    if (!force && fullUrls[photo.path]) return;
    if (force) {
      // Do not hammer the server if the image keeps failing (same 5 s throttle as the grid).
      const last = lastForcedRef.current[photo.path] ?? 0;
      if (Date.now() - last < 5000) return;
      lastForcedRef.current[photo.path] = Date.now();
    }
    try {
      const fresh = await signedUrls([photo.path]);
      setFullUrls((old) => ({ ...old, ...fresh }));
    } catch {
      // The page shows a retry button.
    }
  }, [fullUrls]);

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    const photo = photos[next];
    if (photo) setCurrentId(photo.id);
  }

  async function save() {
    if (!current) return;
    setSaving(true);
    try {
      const fresh = (await signedUrls([current.path]))[current.path];
      if (!fresh) throw new Error('No URL');
      const result = await savePhotoToLibrary(fresh);
      if (result === 'denied') {
        Alert.alert(
          'Permission needed',
          'Allow GuestGallery to add photos in your Settings to save this photo.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        );
      } else {
        Alert.alert('Saved to your photos');
      }
    } catch {
      Alert.alert('Could not save the photo', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!current) return;
    const photo = current;
    Alert.alert('Delete this photo?', 'It will be removed for everyone. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setDeleting(true);
          // Mark closing first: the realtime DELETE can arrive before the request returns, and must
          // not show the "This photo was deleted" message meant for other viewers.
          closingRef.current = photo.id;
          deletePhoto(photo)
            .then(() => leave())
            .catch(async (e: unknown) => {
              // A lost response may hide a successful delete: read the photo back to decide.
              let gone: boolean | null;
              try {
                gone = (await fetchPhoto(photo.id)) === null;
              } catch {
                gone = null; // outcome unknown: the read-back failed too
              }
              if (gone) {
                leave();
              } else if (gone === null) {
                // Say so once; when the realtime DELETE shows up later the viewer closes silently.
                unknownDeleteRef.current = photo.id;
                setRecheck((n) => n + 1); // re-run the missing-photo check (it may be gone already)
                if (!leftRef.current) {
                  Alert.alert(
                    'Could not confirm the delete',
                    'Check your connection. The photo may already be deleted.',
                  );
                }
              } else {
                closingRef.current = null;
                if (!leftRef.current) {
                  Alert.alert(
                    'Could not delete the photo',
                    deleteErrorMessage(e instanceof Error ? e.message : undefined),
                  );
                }
              }
            })
            .finally(() => setDeleting(false));
        },
      },
    ]);
  }

  if (index < 0 && !current) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color="#fff" />
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Button title="Close" color="#fff" disabled={deleting} onPress={leave} />
        </View>
      </View>
    );
  }

  const challenge = current?.challenge_id ? titles[current.challenge_id] : null;

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={photos}
        keyExtractor={(p) => p.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.max(index, 0)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={onMomentumEnd}
        extraData={fullUrls}
        renderItem={({ item }) => (
          <Page
            photo={item}
            url={fullUrls[item.path]}
            width={width}
            height={height}
            onNeedUrl={(force) => void ensureUrl(item, force)}
          />
        )}
      />
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Button title="Close" color="#fff" disabled={deleting} onPress={leave} />
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.author}>{current?.author_nickname ?? 'Unknown guest'}</Text>
        <Text style={styles.meta}>{current ? formatPhotoTime(current.created_at) : ''}</Text>
        {challenge ? <Text style={styles.meta}>Challenge: {challenge}</Text> : null}
        <View style={styles.actions}>
          <Button
            title={saving ? 'Saving...' : 'Save to phone'}
            color="#fff"
            disabled={saving || !current}
            onPress={() => void save()}
          />
          {current && canDeletePhoto(current, session?.user.id, isHost) ? (
            <Button
              title={deleting ? 'Deleting...' : 'Delete'}
              color="#ff6b6b"
              disabled={deleting}
              onPress={confirmDelete}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Page({
  photo,
  url,
  width,
  height,
  onNeedUrl,
}: {
  photo: GalleryPhoto;
  url: string | undefined;
  width: number;
  height: number;
  onNeedUrl: (force: boolean) => void;
}) {
  useEffect(() => {
    onNeedUrl(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.id]);

  return (
    <View style={{ width, height, justifyContent: 'center' }}>
      {url ? (
        <Image
          source={{ uri: url, cacheKey: photo.path }}
          style={styles.full}
          contentFit="contain"
          onError={() => onNeedUrl(true)}
        />
      ) : (
        <ActivityIndicator color="#fff" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '100%' },
  top: { position: 'absolute', top: 0, left: 0, paddingHorizontal: 8 },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 2,
  },
  author: { color: '#fff', fontSize: 17, fontWeight: '600' },
  meta: { color: '#ddd', fontSize: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
});
