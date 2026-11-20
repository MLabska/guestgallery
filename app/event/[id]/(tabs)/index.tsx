import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';

import { useEvent } from '../../../../src/hooks/useEvent';
import { useEventId } from '../../../../src/hooks/useEventId';
import { UPLOADS_CLOSED_MESSAGE } from '../../../../src/lib/uploadErrors';
import { MAX_PHOTOS_PER_BATCH } from '../../../../src/lib/uploadQueue';
import { uploadsOpen } from '../../../../src/lib/uploadWindow';

// Gallery tab. The photo grid is built in step 6; step 5 adds the upload buttons
// and the "uploads closed" banner (SPEC 3.1, 3.2, 3.4).
export default function GalleryTab() {
  const id = useEventId();
  const router = useRouter();
  const { event, loading, error, reload, refresh } = useEvent(id);

  // Re-read uploads_close_at whenever the tab regains focus (e.g. back from the upload screen
  // after a server rejection), so the gallery switches to read-only (DESIGN.md §9, SPEC 3.4).
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

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error || !event) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error ?? 'Event not found'}</Text>
        <Button title="Try again" onPress={reload} />
      </View>
    );
  }

  const open = uploadsOpen(event.uploads_close_at);

  return (
    <View style={styles.container}>
      {!open && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{UPLOADS_CLOSED_MESSAGE}</Text>
        </View>
      )}
      <Text style={styles.text}>The gallery will appear here.</Text>
      {open && (
        <View style={styles.buttons}>
          <Button
            title="Take photo"
            onPress={() => router.push({ pathname: '/event/[id]/camera', params: { id } })}
          />
          <Button title="Choose from library" onPress={() => void pickFromLibrary()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  text: { color: '#666' },
  error: { color: '#b00020', textAlign: 'center' },
  buttons: { gap: 8 },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: '#b00020',
  },
  bannerText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
