import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { AppButton } from '../../src/components/AppButton';
import { TextField } from '../../src/components/TextField';

import { parseTypedCode } from '../../src/lib/joinCode';
import { EVENT_NOT_FOUND_MESSAGE } from '../../src/lib/joinErrors';
import { colors, spacing } from '../../src/theme';

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
    // replace, not push: after joining the stack is Home > Event, like the QR path.
    router.replace({ pathname: '/join/nickname', params: { code } });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TextField
        label="Event code"
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
        error={error}
      />
      <AppButton title="Continue" onPress={onContinue} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.background },
  input: { fontSize: 20, letterSpacing: 2 },
});
