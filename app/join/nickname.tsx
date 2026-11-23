import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { joinEvent } from '../../src/api/events';
import { AppButton } from '../../src/components/AppButton';
import { TextField } from '../../src/components/TextField';
import { isEventNotFound } from '../../src/lib/joinErrors';
import { NICKNAME_MAX, validateNickname } from '../../src/lib/validation';
import { colors, spacing } from '../../src/theme';

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
      <TextField
        label="Your nickname"
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
        error={error}
      />
      {notFound && !saving ? (
        <AppButton title="Enter another code" onPress={() => router.replace('/join/code')} />
      ) : (
        <AppButton title="Join event" loading={saving} onPress={() => void onJoin()} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.background },
});
