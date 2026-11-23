import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../../src/components/AppButton';
import { EmptyState } from '../../../src/components/EmptyState';

import { useEventId } from '../../../src/hooks/useEventId';
import { colors, spacing } from '../../../src/theme';

// In-app camera (SPEC 3.1): front/back switch, then the upload preview.
export default function CameraScreen() {
  const id = useEventId();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <View style={styles.permission}>
        <EmptyState
          icon="camera-outline"
          title={
            'GuestGallery needs the camera to take photos for this event. You can also choose photos from your library.'
          }
        >
          {permission.canAskAgain ? (
            <AppButton title="Allow camera" onPress={() => void requestPermission()} />
          ) : (
            <AppButton title="Open Settings" onPress={() => void Linking.openSettings()} />
          )}
          <AppButton title="Go back" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView ref={camera} style={styles.flex} facing={facing} />
      <View style={[styles.controls, { bottom: Math.max(insets.bottom, 12) + 20 }]}>
        <AppButton title="Cancel" variant="onMedia" onPress={() => router.back()} />
        <AppButton
          title={busy ? 'Saving...' : 'Take photo'}
          icon="camera"
          style={styles.shutter}
          onPress={() => void takePhoto()}
        />
        <AppButton
          title="Flip"
          variant="onMedia"
          icon="camera-reverse-outline"
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.media },
  permission: { flex: 1, backgroundColor: colors.background },
  shutter: { paddingHorizontal: spacing.xl },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
});
