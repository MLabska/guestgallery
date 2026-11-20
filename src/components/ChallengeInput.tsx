import { useState } from 'react';
import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CHALLENGE_SUGGESTIONS } from '../constants/challengeSuggestions';
import { hasTitle, remainingSuggestions } from '../lib/challenges';
import type { ChallengeDraft } from '../lib/challenges';
import {
  CHALLENGE_DESCRIPTION_MAX,
  CHALLENGE_TITLE_MAX,
  validateChallengeDescription,
  validateChallengeTitle,
} from '../lib/validation';

type Props = {
  /** Titles already in the list, to hide used suggestions and reject duplicates. */
  existingTitles: string[];
  /** May return a promise resolving to false when the add failed: the typed text is then kept. */
  onAdd: (draft: ChallengeDraft) => void | boolean | Promise<boolean>;
  disabled?: boolean;
};

/** Suggestion chips plus a form for a custom challenge (SPEC 5.1). */
export function ChallengeInput({ existingTitles, onAdd, disabled }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const titleResult = validateChallengeTitle(title);
    const descResult = validateChallengeDescription(description);
    if (!titleResult.valid) return setError(titleResult.error);
    if (!descResult.valid) return setError(descResult.error);
    if (hasTitle(existingTitles, titleResult.value)) {
      return setError('This challenge is already in the list');
    }
    setError(null);
    const ok = await onAdd({ title: titleResult.value, description: descResult.value });
    if (ok === false) return;
    setTitle('');
    setDescription('');
  }

  const suggestions = remainingSuggestions(CHALLENGE_SUGGESTIONS, existingTitles);

  return (
    <View style={styles.box}>
      {suggestions.length > 0 && (
        <>
          <Text style={styles.label}>Suggestions</Text>
          <View style={styles.chips}>
            {suggestions.map((s) => (
              <Pressable
                key={s}
                style={styles.chip}
                disabled={disabled}
                onPress={() => onAdd({ title: s, description: null })}
                accessibilityLabel={`Add suggestion ${s}`}
              >
                <Text style={styles.chipText}>+ {s}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Text style={styles.label}>Your own challenge</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        maxLength={CHALLENGE_TITLE_MAX + 20}
        editable={!disabled}
      />
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optional)"
        maxLength={CHALLENGE_DESCRIPTION_MAX + 20}
        editable={!disabled}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Add challenge" onPress={() => void submit()} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  label: { fontWeight: '600', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#e8f0fe', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { color: '#0a58ca' },
  input: { borderWidth: 1, borderColor: '#c7c7cc', borderRadius: 8, padding: 10, fontSize: 16 },
  error: { color: '#b00020' },
});
