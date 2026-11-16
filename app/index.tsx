import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../src/hooks/useSession';

// Placeholder home screen: proves Expo Router and anonymous sign-in work (step 1).
export default function HomeScreen() {
  const { session, loading, error } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GuestGallery</Text>
      {loading && <ActivityIndicator />}
      {error && <Text style={styles.error}>Sign-in failed: {error}</Text>}
      {session && <Text>Signed in anonymously as {session.user.id}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  error: { color: '#b00020' },
});
