import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '../../../../src/components/AppButton';
import { Banner } from '../../../../src/components/Banner';
import { EmptyState } from '../../../../src/components/EmptyState';
import { PhotoGrid } from '../../../../src/components/PhotoGrid';
import { useEvent } from '../../../../src/hooks/useEvent';
import { useEventId } from '../../../../src/hooks/useEventId';
import { useEventPhotos } from '../../../../src/hooks/useEventPhotos';
import { UPLOADS_CLOSED_MESSAGE } from '../../../../src/lib/uploadErrors';
import { MAX_PHOTOS_PER_BATCH } from '../../../../src/lib/uploadQueue';
import { uploadsOpen } from '../../../../src/lib/uploadWindow';
import { colors, spacing } from '../../../../src/theme';

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
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }
    return (
      <EmptyState icon="cloud-offline-outline" title={error ?? 'Event not found'}>
        <AppButton title="Try again" variant="secondary" onPress={reload} />
      </EmptyState>
    );
  }

  const open = uploadsOpen(event.uploads_close_at);
  const takePhoto = () => router.push({ pathname: '/event/[id]/camera', params: { id } });
  const offline = error || gallery.error;

  const buttons = open ? (
    <View style={styles.buttons}>
      <AppButton title="Take photo" icon="camera" style={styles.flex} onPress={takePhoto} />
      <AppButton
        title="Choose from library"
        icon="images"
        variant="secondary"
        style={styles.flex}
        onPress={() => void pickFromLibrary()}
      />
    </View>
  ) : null;

  const empty = gallery.loading ? (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  ) : gallery.error ? (
    <EmptyState icon="cloud-offline-outline" title="Could not load photos. Pull down to retry." />
  ) : (
    <EmptyState icon="camera-outline" title="No photos yet – be the first!">
      {open && <AppButton title="Take photo" icon="camera" onPress={takePhoto} />}
    </EmptyState>
  );

  return (
    <View style={styles.container}>
      {!open && (
        <Banner kind="error" text={UPLOADS_CLOSED_MESSAGE} style={styles.banner} />
      )}
      {offline ? (
        <Banner
          kind="warning"
          text="No connection – showing the last loaded photos. Pull down to retry."
          style={styles.banner}
        />
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
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  buttons: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  banner: { margin: spacing.md, marginBottom: 0 },
});
