import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Linking, StyleSheet, Text, View } from 'react-native';

import { useEventId } from '../../../src/hooks/useEventId';

// In-app camera (SPEC 3.1): front/back switch, then the upload preview.
export default function CameraScreen() {
  const id = useEventId();
  const router = useRouter();
  const { challengeId } = useLocalSearchParams<{ challengeId?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [busy, setBusy] = useState(false);
  const camera = useRef<CameraView>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  async function takePhoto() {
    if (busy || !camera.current) return;
    setBusy(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.9 });
      router.replace({
        pathname: '/event/[id]/upload',
        params: {
          id,
          uris: JSON.stringify([photo.uri]),
          source: 'camera',
          ...(challengeId ? { challengeId } : {}),
        },
      });
    } catch {
      setBusy(false);
      Alert.alert('Could not take the photo', 'Please try again.');
    }
  }

  if (!permission) return <View style={styles.flex} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>
          GuestGallery needs the camera to take photos for this event. You can also choose photos
          from your library.
        </Text>
        {permission.canAskAgain ? (
          <Button title="Allow camera" onPress={() => void requestPermission()} />
        ) : (
          <Button title="Open Settings" onPress={() => void Linking.openSettings()} />
        )}
        <Button title="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView ref={camera} style={styles.flex} facing={facing} />
      <View style={styles.controls}>
        <Button title="Cancel" color="#fff" onPress={() => router.back()} />
        <Button
          title={busy ? 'Saving...' : 'Take photo'}
          color="#fff"
          onPress={() => void takePhoto()}
        />
        <Button
          title="Flip"
          color="#fff"
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  text: { textAlign: 'center' },
  controls: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
});
