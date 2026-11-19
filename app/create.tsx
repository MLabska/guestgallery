import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { createEvent } from '../src/api/events';
import { toIsoDate } from '../src/lib/dates';
import {
  EVENT_NAME_MAX,
  NICKNAME_MAX,
  validateEventDate,
  validateEventName,
  validateNickname,
} from '../src/lib/validation';

// Create event (SPEC 1.1). Challenges are added in step 7, not here.
export default function CreateEventScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [nickname, setNickname] = useState('Host');
  const [errors, setErrors] = useState<{ name?: string; date?: string; nickname?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit() {
    const nameResult = validateEventName(name);
    const dateResult = validateEventDate(date);
    const nicknameResult = validateNickname(nickname);
    setErrors({
      name: nameResult.valid ? undefined : nameResult.error,
      date: dateResult.valid ? undefined : dateResult.error,
      nickname: nicknameResult.valid ? undefined : nicknameResult.error,
    });
    setSubmitError(null);
    if (!nameResult.valid || !dateResult.valid || !nicknameResult.valid) return;

    setSaving(true);
    try {
      const { id } = await createEvent(nameResult.value, dateResult.value, nicknameResult.value);
      router.replace(`/event/${id}/info`);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Could not create the event');
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Event name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Anna and Tom's wedding"
          maxLength={EVENT_NAME_MAX + 20}
          editable={!saving}
        />
        {errors.name && <Text style={styles.error}>{errors.name}</Text>}

        <Text style={styles.label}>Event date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="2026-12-31"
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          editable={!saving}
        />
        {errors.date && <Text style={styles.error}>{errors.date}</Text>}

        <Text style={styles.label}>Your nickname</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          maxLength={NICKNAME_MAX + 20}
          editable={!saving}
        />
        {errors.nickname && <Text style={styles.error}>{errors.nickname}</Text>}

        {submitError && <Text style={styles.error}>{submitError}</Text>}
        {saving ? <ActivityIndicator /> : <Button title="Create event" onPress={onSubmit} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 8 },
  label: { fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#c7c7cc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  error: { color: '#b00020' },
});
