import { StyleSheet, Text, View } from 'react-native';

// Placeholder: the live gallery is built in step 6.
export default function GalleryTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>The gallery will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { color: '#666' },
});
