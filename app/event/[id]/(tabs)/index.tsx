import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';

import { PhotoGrid } from '../../../../src/components/PhotoGrid';
import { useEvent } from '../../../../src/hooks/useEvent';
import { useEventId } from '../../../../src/hooks/useEventId';
import { useEventPhotos } from '../../../../src/hooks/useEventPhotos';
import { UPLOADS_CLOSED_MESSAGE } from '../../../../src/lib/uploadErrors';
import { MAX_PHOTOS_PER_BATCH } from '../../../../src/lib/uploadQueue';
import { uploadsOpen } from '../../../../src/lib/uploadWindow';

// Gallery tab: live photo grid (SPEC 4.1) with the upload buttons and the
// "uploads closed" banner (SPEC 3.1, 3.2, 3.4).
export default function GalleryTab() {
  const id = useEventId();
  const router = useRouter();
  const { event, loading, error, reload, refresh } = useEvent(id);
  const gallery = useEventPhotos();

  // Re-read uploads_close_at whenever the tab regains focus (e.g. back from the upload screen
  // after a server rejection), so the gallery switches to read-only (DESIGN.md section 9, SPEC 3.4).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function pickFromLibrary() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS_PER_BATCH,
        orderedSelection: true,
      });
      if (result.canceled || result.assets.length === 0) return;
      const uris = result.assets.slice(0, MAX_PHOTOS_PER_BATCH).map((a) => a.uri);
      router.push({
        pathname: '/event/[id]/upload',
        params: { id, uris: JSON.stringify(uris), source: 'library' },
      });
    } catch {
      Alert.alert('Could not open your photo library');
    }
  }

  // The full error screen is only for "no event yet" (DESIGN.md section 9, No connection): once
  // the event has loaded, a failed background refresh keeps the gallery and shows a banner.
  if (!event) {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Event not found'}</Text>
        <Button title="Try again" onPress={reload} />
      </View>
    );
  }

  const open = uploadsOpen(event.uploads_close_at);
  const takePhoto = () => router.push({ pathname: '/event/[id]/camera', params: { id } });
  const offline = error || gallery.error;

  const buttons = open ? (
    <View style={styles.buttons}>
      <Button title="Take photo" onPress={takePhoto} />
      <Button title="Choose from library" onPress={() => void pickFromLibrary()} />
    </View>
  ) : null;

  const empty = gallery.loading ? (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  ) : gallery.error ? (
    <View style={styles.center}>
      <Text style={styles.text}>Could not load photos. Pull down to retry.</Text>
    </View>
  ) : (
    <View style={styles.center}>
      <Text style={styles.text}>No photos yet – be the first!</Text>
      {open && <Button title="Take photo" onPress={takePhoto} />}
    </View>
  );

  return (
    <View style={styles.container}>
      {!open && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{UPLOADS_CLOSED_MESSAGE}</Text>
        </View>
      )}
      {offline ? (
        <View style={[styles.banner, styles.warning]}>
          <Text style={styles.bannerText}>
            No connection – showing the last loaded photos. Pull down to retry.
          </Text>
        </View>
      ) : null}
      <PhotoGrid
        photos={gallery.photos}
        urls={gallery.urls}
        refreshing={gallery.refreshing}
        onRefresh={() => {
          refresh();
          void gallery.refresh();
        }}
        onEndReached={() => void gallery.loadMore()}
        onOpen={(photo) =>
          router.push({ pathname: '/event/[id]/photo/[photoId]', params: { id, photoId: photo.id } })
        }
        onImageError={gallery.reportImageError}
        header={buttons}
        empty={empty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  text: { color: '#666' },
  error: { color: '#b00020', textAlign: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'space-evenly', padding: 8 },
  banner: { padding: 12, backgroundColor: '#b00020' },
  warning: { backgroundColor: '#8a6d00' },
  bannerText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
