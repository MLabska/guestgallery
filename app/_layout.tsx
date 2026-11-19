import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';

import { SessionProvider, useSession } from '../src/hooks/useSession';

/** Renders the screens only once the app-wide session is ready (DESIGN.md §7). */
function SessionGate({ children }: { children: ReactNode }) {
  const { session, error, retry } = useSession();

  if (session) return <>{children}</>;

  return (
    <View style={styles.center}>
      {error ? (
        <>
          <Text style={styles.error}>Sign-in failed: {error}</Text>
          <Button title="Try again" onPress={retry} />
        </>
      ) : (
        <ActivityIndicator size="large" />
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <SessionGate>
        <Stack screenOptions={{ headerTitle: 'GuestGallery' }}>
          <Stack.Screen name="create" options={{ title: 'Create event' }} />
          <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
        </Stack>
      </SessionGate>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  error: { color: '#b00020', textAlign: 'center' },
});
