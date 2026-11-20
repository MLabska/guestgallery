import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput } from 'react-native';

import { parseTypedCode } from '../../src/lib/joinCode';
import { EVENT_NOT_FOUND_MESSAGE } from '../../src/lib/joinErrors';

// Enter code (SPEC 2.2): case-insensitive, spaces ignored.
export default function EnterCodeScreen() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onContinue() {
    const code = parseTypedCode(input);
    if (!code) {
      // A string that is not a valid code cannot belong to any event.
      setError(EVENT_NOT_FOUND_MESSAGE);
      return;
    }
    setError(null);
    router.push({ pathname: '/join/nickname', params: { code } });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.label}>Event code</Text>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={(t) => {
          setInput(t);
          setError(null);
        }}
        placeholder="e.g. K7P4QX"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={20}
        onSubmitEditing={onContinue}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Continue" onPress={onContinue} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  label: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#c7c7cc',
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    letterSpacing: 2,
  },
  error: { color: '#b00020' },
});
