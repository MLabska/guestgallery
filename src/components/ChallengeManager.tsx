import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import {
  addChallenges,
  deleteChallenge,
  listChallenges,
  updateChallenge,
} from '../api/challenges';
import { nextPosition, sortChallenges } from '../lib/challenges';
import type { Challenge, ChallengeDraft } from '../lib/challenges';
import {
  CHALLENGE_DESCRIPTION_MAX,
  CHALLENGE_TITLE_MAX,
  validateChallengeDescription,
  validateChallengeTitle,
} from '../lib/validation';
import { colors, spacing } from '../theme';
import { AppButton } from './AppButton';
import { Card } from './Card';
import { ChallengeInput } from './ChallengeInput';
import { TextField } from './TextField';

/** Host-only: add, edit and delete the event's challenges (SPEC 5.1). RLS enforces host-only. */
export function ChallengeManager({ eventId }: { eventId: string }) {
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setChallenges(sortChallenges(await listChallenges(eventId)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load challenges');
    }
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    listChallenges(eventId)
      .then((list) => {
        if (!cancelled) setChallenges(sortChallenges(list));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load challenges');
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function run(action: () => Promise<void>): Promise<boolean> {
    setBusy(true);
    try {
      await action();
      await load();
      return true;
    } catch (e) {
      Alert.alert(e instanceof Error ? e.message : 'Something went wrong');
      return false;
    } finally {
      setBusy(false);
    }
  }

  function startEdit(c: Challenge) {
    setEditingId(c.id);
    setTitle(c.title);
    setDescription(c.description ?? '');
    setEditError(null);
  }

  async function saveEdit(id: string) {
    const t = validateChallengeTitle(title);
    const d = validateChallengeDescription(description);
    if (!t.valid) return setEditError(t.error);
    if (!d.valid) return setEditError(d.error);
    const ok = await run(() => updateChallenge(id, { title: t.value, description: d.value }));
    if (ok) setEditingId(null);
  }

  function confirmDelete(c: Challenge) {
    Alert.alert('Delete challenge?', `"${c.title}" will be removed. Its photos stay in the gallery.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void run(() => deleteChallenge(c.id)),
      },
    ]);
  }

  if (!challenges) {
    return error ? (
      <View style={styles.box}>
        <Text style={styles.error}>{error}</Text>
        <AppButton title="Try again" variant="secondary" onPress={() => void load()} />
      </View>
    ) : (
      <ActivityIndicator color={colors.accent} />
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.heading}>Challenges</Text>
      {challenges.length === 0 && <Text style={styles.muted}>No challenges yet.</Text>}
      {challenges.map((c) =>
        editingId === c.id ? (
          <Card key={c.id}>
            <TextField
              value={title}
              onChangeText={setTitle}
              maxLength={CHALLENGE_TITLE_MAX + 20}
            />
            <TextField
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optional)"
              maxLength={CHALLENGE_DESCRIPTION_MAX + 20}
            />
            {editError && <Text style={styles.error}>{editError}</Text>}
            <View style={styles.actions}>
              <AppButton
                title="Save"
                style={styles.action}
                onPress={() => void saveEdit(c.id)}
                disabled={busy}
              />
              <AppButton
                title="Cancel"
                variant="secondary"
                style={styles.action}
                onPress={() => setEditingId(null)}
              />
            </View>
          </Card>
        ) : (
          <Card key={c.id}>
            <Text style={styles.title}>{c.title}</Text>
            {c.description ? <Text style={styles.muted}>{c.description}</Text> : null}
            <View style={styles.actions}>
              <AppButton
                title="Edit"
                variant="secondary"
                icon="create-outline"
                style={styles.action}
                onPress={() => startEdit(c)}
                disabled={busy}
              />
              <AppButton
                title="Delete"
                variant="danger"
                icon="trash-outline"
                style={styles.action}
                onPress={() => confirmDelete(c)}
                disabled={busy}
              />
            </View>
          </Card>
        ),
      )}
      <ChallengeInput
        existingTitles={challenges.map((c) => c.title)}
        disabled={busy}
        onAdd={(draft: ChallengeDraft) =>
          run(() => addChallenges(eventId, [draft], nextPosition(challenges)))
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', gap: spacing.md },
  heading: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  title: { fontWeight: '600', fontSize: 16, color: colors.text },
  muted: { color: colors.secondaryText, fontSize: 16 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1 },
  error: { color: colors.danger },
});
