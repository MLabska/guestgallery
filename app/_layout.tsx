import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { SessionProvider, useSession } from '../src/hooks/useSession';
import { colors, spacing } from '../src/theme';

/** Renders the screens only once the app-wide session is ready (DESIGN.md §7). */
function SessionGate({ children }: { children: ReactNode }) {
  const { session, error, retry } = useSession();

  if (session) return <>{children}</>;

  return (
    <View style={styles.center}>
      {error ? (
        <>
          <Text style={styles.error}>Sign-in failed: {error}</Text>
          <AppButton title="Try again" onPress={retry} />
        </>
      ) : (
        <ActivityIndicator size="large" color={colors.accent} />
      )}
    </View>
  );
}

// When the app is opened through a deep link (invite QR scanned with the iPhone
// Camera), keep Home underneath so Back / the event screen can return to it.
export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  return (
    <SessionProvider>
      <SessionGate>
        <Stack
          screenOptions={{
            headerTitle: 'GuestGallery',
            headerTintColor: colors.accent,
            headerTitleStyle: { color: colors.text, fontWeight: '700' },
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerLargeTitle: true }} />
          <Stack.Screen name="create" options={{ title: 'Create event' }} />
          <Stack.Screen name="join/scan" options={{ title: 'Scan QR code' }} />
          <Stack.Screen name="join/code" options={{ title: 'Enter code' }} />
          <Stack.Screen name="join/[code]" options={{ title: 'Join event' }} />
          <Stack.Screen name="join/nickname" options={{ title: 'Choose a nickname' }} />
          <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
        </Stack>
      </SessionGate>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  error: { color: colors.danger, textAlign: 'center' },
});
