import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CHALLENGE_SUGGESTIONS } from '../constants/challengeSuggestions';
import { hasTitle, remainingSuggestions } from '../lib/challenges';
import type { ChallengeDraft } from '../lib/challenges';
import {
  CHALLENGE_DESCRIPTION_MAX,
  CHALLENGE_TITLE_MAX,
  validateChallengeDescription,
  validateChallengeTitle,
} from '../lib/validation';
import { colors, radii, spacing } from '../theme';
import { AppButton } from './AppButton';
import { TextField } from './TextField';
import { SectionHeader } from './Typography';

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
  // Suggestions being added right now (async onAdd): a fast second tap is ignored.
  const pendingRef = useRef(new Set<string>());

  async function addSuggestion(s: string) {
    if (pendingRef.current.has(s)) return;
    pendingRef.current.add(s);
    try {
      await onAdd({ title: s, description: null });
    } finally {
      pendingRef.current.delete(s);
    }
  }

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
          <SectionHeader>Suggestions</SectionHeader>
          <View style={styles.chips}>
            {suggestions.map((s) => (
              <Pressable
                key={s}
                style={[styles.chip, disabled && styles.chipDisabled]}
                disabled={disabled}
                onPress={() => void addSuggestion(s)}
                accessibilityLabel={`Add suggestion ${s}`}
              >
                <Text style={styles.chipText}>+ {s}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <SectionHeader>Your own challenge</SectionHeader>
      <TextField
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        maxLength={CHALLENGE_TITLE_MAX + 20}
        editable={!disabled}
      />
      <TextField
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optional)"
        maxLength={CHALLENGE_DESCRIPTION_MAX + 20}
        editable={!disabled}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <AppButton
        title="Add challenge"
        variant="secondary"
        icon="add"
        onPress={() => void submit()}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipDisabled: { opacity: 0.4 },
  chipText: { color: colors.accent, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 14 },
});
