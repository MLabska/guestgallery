import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../src/components/AppButton';
import { Banner } from '../../src/components/Banner';
import { EmptyState } from '../../src/components/EmptyState';

import { NOT_A_GUESTGALLERY_CODE_MESSAGE } from '../../src/lib/joinErrors';
import { parseJoinUrl } from '../../src/lib/qr';
import { colors, spacing } from '../../src/theme';

// Scan QR (SPEC 2.1): a valid code goes to the nickname screen, anything else keeps scanning.
export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState<string | null>(null);
  const handled = useRef(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ask for permission the first time the screen opens.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, []);

  function onScanned(data: string) {
    if (handled.current) return;
    const code = parseJoinUrl(data);
    if (!code) {
      setMessage(NOT_A_GUESTGALLERY_CODE_MESSAGE);
      if (messageTimer.current) clearTimeout(messageTimer.current);
      messageTimer.current = setTimeout(() => setMessage(null), 2500);
      return;
    }
    handled.current = true;
    router.replace({ pathname: '/join/nickname', params: { code } });
  }

  if (!permission) return <View style={styles.flex} />;

  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <EmptyState
          icon="camera-outline"
          title={
            'GuestGallery needs the camera to scan the QR code of an event. You can also enter the event code by hand.'
          }
        >
          {permission.canAskAgain ? (
            <AppButton title="Allow camera" onPress={() => void requestPermission()} />
          ) : (
            <AppButton title="Open Settings" onPress={() => void Linking.openSettings()} />
          )}
          <AppButton
            title="Enter code manually"
            variant="secondary"
            onPress={() => router.replace('/join/code')}
          />
        </EmptyState>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={styles.flex}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => onScanned(data)}
      />
      {message && (
        <Banner kind="error" text={message} style={styles.banner} />
      )}
      <View style={[styles.bottom, { bottom: Math.max(insets.bottom, 12) + 20 }]}>
        <AppButton
          title="Enter code manually"
          variant="onMedia"
          style={styles.manual}
          onPress={() => router.replace('/join/code')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.media },
  permission: { flex: 1, backgroundColor: colors.background },
  banner: { position: 'absolute', top: spacing.xl, left: spacing.lg, right: spacing.lg },
  bottom: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  manual: { backgroundColor: colors.mediaOverlay, paddingHorizontal: spacing.xl },
});
