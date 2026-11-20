import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { joinEvent } from '../../src/api/events';
import { isEventNotFound } from '../../src/lib/joinErrors';
import { NICKNAME_MAX, validateNickname } from '../../src/lib/validation';

// Nickname (SPEC 2.3): joins through the join_event RPC, then opens the event.
export default function NicknameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = typeof params.code === 'string' ? params.code : '';
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onJoin() {
    const result = validateNickname(nickname);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { id } = await joinEvent(code, result.value);
      router.replace(`/event/${id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not join the event');
      setSaving(false);
    }
  }

  const notFound = error !== null && isEventNotFound(error);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.label}>Your nickname</Text>
      <TextInput
        style={styles.input}
        value={nickname}
        onChangeText={(t) => {
          setNickname(t);
          setError(null);
        }}
        placeholder="e.g. Anna"
        maxLength={NICKNAME_MAX + 20}
        autoFocus
        editable={!saving}
        onSubmitEditing={() => void onJoin()}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {saving ? (
        <ActivityIndicator />
      ) : notFound ? (
        <Button title="Enter another code" onPress={() => router.replace('/join/code')} />
      ) : (
        <Button title="Join event" onPress={() => void onJoin()} />
      )}
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
    fontSize: 16,
  },
  error: { color: '#b00020' },
});
