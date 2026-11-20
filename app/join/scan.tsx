import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Button, Linking, StyleSheet, Text, View } from 'react-native';

import { NOT_A_GUESTGALLERY_CODE_MESSAGE } from '../../src/lib/joinErrors';
import { parseJoinUrl } from '../../src/lib/qr';

// Scan QR (SPEC 2.1): a valid code goes to the nickname screen, anything else keeps scanning.
export default function ScanScreen() {
  const router = useRouter();
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
      <View style={styles.center}>
        <Text style={styles.text}>
          GuestGallery needs the camera to scan the QR code of an event. You can also enter the
          event code by hand.
        </Text>
        {permission.canAskAgain ? (
          <Button title="Allow camera" onPress={() => void requestPermission()} />
        ) : (
          <Button title="Open Settings" onPress={() => void Linking.openSettings()} />
        )}
        <Button title="Enter code manually" onPress={() => router.replace('/join/code')} />
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
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{message}</Text>
        </View>
      )}
      <View style={styles.bottom}>
        <Button
          title="Enter code manually"
          color="#fff"
          onPress={() => router.replace('/join/code')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  text: { textAlign: 'center' },
  banner: {
    position: 'absolute',
    top: 24,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#b00020',
  },
  bannerText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  bottom: { position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center' },
});
