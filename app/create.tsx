import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { addChallenges } from '../src/api/challenges';
import { createEvent } from '../src/api/events';
import { AppButton } from '../src/components/AppButton';
import { Banner } from '../src/components/Banner';
import { Card } from '../src/components/Card';
import { ChallengeInput } from '../src/components/ChallengeInput';
import { DateField } from '../src/components/DateField';
import { TextField } from '../src/components/TextField';
import { SectionHeader } from '../src/components/Typography';
import { hasTitle } from '../src/lib/challenges';
import type { ChallengeDraft } from '../src/lib/challenges';
import { toIsoDate } from '../src/lib/dates';
import {
  EVENT_NAME_MAX,
  NICKNAME_MAX,
  validateEventDate,
  validateEventName,
  validateNickname,
} from '../src/lib/validation';
import { colors, spacing } from '../src/theme';

// Create event (SPEC 1.1) with optional challenges (SPEC 5.1).
export default function CreateEventScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [nickname, setNickname] = useState('Host');
  const [errors, setErrors] = useState<{ name?: string; date?: string; nickname?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [challenges, setChallenges] = useState<ChallengeDraft[]>([]);

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
      try {
        await addChallenges(id, challenges);
      } catch {
        // The event exists already: go on and let the host retry from Event info.
        Alert.alert(
          'Challenges not saved',
          'The event was created, but its challenges could not be saved. Add them again in Event info.',
        );
      }
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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Event name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Anna and Tom's wedding"
          maxLength={EVENT_NAME_MAX + 20}
          editable={!saving}
          error={errors.name}
        />

        <DateField
          label="Event date"
          value={date}
          onChange={setDate}
          disabled={saving}
          error={errors.date}
        />

        <TextField
          label="Your nickname"
          value={nickname}
          onChangeText={setNickname}
          maxLength={NICKNAME_MAX + 20}
          editable={!saving}
          error={errors.nickname}
        />

        <SectionHeader style={styles.section}>Challenges (optional)</SectionHeader>
        {challenges.map((c) => (
          <Card key={c.title} style={styles.challengeCard}>
            <Text style={styles.challenge}>{c.title}</Text>
            <Text
              style={styles.remove}
              onPress={() => !saving && setChallenges((l) => l.filter((x) => x.title !== c.title))}
              accessibilityRole="button"
            >
              Remove
            </Text>
          </Card>
        ))}
        <ChallengeInput
          existingTitles={challenges.map((c) => c.title)}
          disabled={saving}
          // Functional check: a fast double tap on a chip must not add the same title twice.
          onAdd={(draft) =>
            setChallenges((l) => (hasTitle(l.map((c) => c.title), draft.title) ? l : [...l, draft]))
          }
        />

        {submitError && <Banner kind="error" text={submitError} />}
        <View style={styles.submit}>
          <AppButton title="Create event" loading={saving} onPress={onSubmit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.lg },
  section: { marginTop: spacing.md },
  challengeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  challenge: { fontSize: 16, color: colors.text, flex: 1 },
  remove: { color: colors.danger, fontSize: 16, fontWeight: '600', paddingVertical: spacing.sm },
  submit: { marginTop: spacing.sm },
});
