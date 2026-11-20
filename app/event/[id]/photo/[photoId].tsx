import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import { fetchChallengeTitles, signedUrls } from '../../../../src/api/photos';
import { savePhotoToLibrary } from '../../../../src/api/savePhoto';
import { useEventId } from '../../../../src/hooks/useEventId';
import { useEventPhotos } from '../../../../src/hooks/useEventPhotos';
import { formatPhotoTime } from '../../../../src/lib/photoList';
import type { GalleryPhoto } from '../../../../src/lib/photoList';

// Full-screen viewer (SPEC 4.2, 4.3). Swipe left/right moves through the gallery list.
export default function PhotoViewer() {
  const eventId = useEventId();
  const { photoId } = useLocalSearchParams<{ photoId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { photos } = useEventPhotos();
  const listRef = useRef<FlatList<GalleryPhoto>>(null);

  const [currentId, setCurrentId] = useState<string>(photoId);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [fullUrls, setFullUrls] = useState<Record<string, string>>({});
  const seenRef = useRef(false);
  const closingRef = useRef(false);
  const lastForcedRef = useRef<Record<string, number>>({});

  const index = photos.findIndex((p) => p.id === currentId);
  const current = index >= 0 ? photos[index] : null;

  useEffect(() => {
    fetchChallengeTitles(eventId)
      .then(setTitles)
      .catch(() => undefined);
  }, [eventId]);

  // The photo was deleted while it is open: close the viewer with a short message (DESIGN.md section 9).
  useEffect(() => {
    if (current) {
      seenRef.current = true;
      return;
    }
    if (!seenRef.current || closingRef.current) return;
    closingRef.current = true;
    Alert.alert('This photo was deleted');
    router.back();
  }, [current, router]);

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

  if (index < 0 && !current) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color="#fff" />
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Button title="Close" color="#fff" onPress={() => router.back()} />
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
        <Button title="Close" color="#fff" onPress={() => router.back()} />
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
  actions: { alignItems: 'flex-start', marginTop: 4 },
});
