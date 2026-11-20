import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

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
import { ChallengeInput } from './ChallengeInput';

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
        <Button title="Try again" onPress={() => void load()} />
      </View>
    ) : (
      <ActivityIndicator />
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.heading}>Challenges</Text>
      {challenges.length === 0 && <Text style={styles.muted}>No challenges yet.</Text>}
      {challenges.map((c) =>
        editingId === c.id ? (
          <View key={c.id} style={styles.row}>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              maxLength={CHALLENGE_TITLE_MAX + 20}
            />
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optional)"
              maxLength={CHALLENGE_DESCRIPTION_MAX + 20}
            />
            {editError && <Text style={styles.error}>{editError}</Text>}
            <View style={styles.actions}>
              <Button title="Save" onPress={() => void saveEdit(c.id)} disabled={busy} />
              <Button title="Cancel" onPress={() => setEditingId(null)} />
            </View>
          </View>
        ) : (
          <View key={c.id} style={styles.row}>
            <Text style={styles.title}>{c.title}</Text>
            {c.description ? <Text style={styles.muted}>{c.description}</Text> : null}
            <View style={styles.actions}>
              <Button title="Edit" onPress={() => startEdit(c)} disabled={busy} />
              <Button
                title="Delete"
                color="#b00020"
                onPress={() => confirmDelete(c)}
                disabled={busy}
              />
            </View>
          </View>
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
  box: { alignSelf: 'stretch', gap: 10 },
  heading: { fontSize: 20, fontWeight: '700' },
  row: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, gap: 6 },
  title: { fontWeight: '600', fontSize: 16 },
  muted: { color: '#666' },
  actions: { flexDirection: 'row', gap: 16 },
  input: { borderWidth: 1, borderColor: '#c7c7cc', borderRadius: 8, padding: 10, fontSize: 16 },
  error: { color: '#b00020' },
});
