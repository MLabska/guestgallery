import { CHALLENGE_SUGGESTIONS } from '../src/constants/challengeSuggestions';
import {
  countByChallenge,
  hasTitle,
  nextPosition,
  photoCountLabel,
  remainingSuggestions,
  sortChallenges,
  submittedChallengeIds,
  toChallengeItems,
} from '../src/lib/challenges';
import type { Challenge } from '../src/lib/challenges';
import {
  CHALLENGE_TITLE_MAX,
  validateChallengeDescription,
  validateChallengeTitle,
} from '../src/lib/validation';

const c = (id: string, position: number, title = id): Challenge => ({
  id,
  event_id: 'e',
  title,
  description: null,
  position,
});

describe('counting and marking', () => {
  const photos = [
    { challenge_id: 'a' },
    { challenge_id: 'a' },
    { challenge_id: 'b' },
    { challenge_id: null },
  ];

  it('counts photos per challenge and ignores untagged ones', () => {
    expect(countByChallenge(photos)).toEqual({ a: 2, b: 1 });
  });

  it('collects the challenge ids I submitted to', () => {
    expect(submittedChallengeIds([{ challenge_id: 'b' }, { challenge_id: null }])).toEqual(
      new Set(['b']),
    );
  });

  it('builds list rows with count and check mark, in position order', () => {
    const items = toChallengeItems(
      [c('b', 1), c('a', 0), c('z', 2)],
      { a: 2, b: 1 },
      new Set(['b']),
    );
    expect(items.map((i) => [i.id, i.photoCount, i.submitted])).toEqual([
      ['a', 2, false],
      ['b', 1, true],
      ['z', 0, false],
    ]);
  });
});

describe('ordering and positions', () => {
  it('sorts by position, then title, without mutating the input', () => {
    const input = [c('x', 1, 'B'), c('y', 1, 'A'), c('z', 0, 'C')];
    expect(sortChallenges(input).map((i) => i.id)).toEqual(['z', 'y', 'x']);
    expect(input[0].id).toBe('x');
  });

  it('puts a new challenge after the last one', () => {
    expect(nextPosition([])).toBe(0);
    expect(nextPosition([c('a', 0), c('b', 4)])).toBe(5);
  });
});

describe('titles and suggestions', () => {
  it('matches titles case-insensitively and trimmed', () => {
    expect(hasTitle(['Dance'], '  dance ')).toBe(true);
    expect(hasTitle(['Dance'], 'Selfie')).toBe(false);
  });

  it('hides suggestions that are already chosen', () => {
    const first = CHALLENGE_SUGGESTIONS[0];
    const left = remainingSuggestions(CHALLENGE_SUGGESTIONS, [first.toUpperCase()]);
    expect(left).not.toContain(first);
    expect(left).toHaveLength(CHALLENGE_SUGGESTIONS.length - 1);
  });

  it('keeps every suggestion within the title limit', () => {
    for (const s of CHALLENGE_SUGGESTIONS) expect(validateChallengeTitle(s).valid).toBe(true);
    expect(CHALLENGE_SUGGESTIONS.every((s) => s.length <= CHALLENGE_TITLE_MAX)).toBe(true);
  });

  it('labels counts', () => {
    expect(photoCountLabel(0)).toBe('0 photos');
    expect(photoCountLabel(1)).toBe('1 photo');
    expect(photoCountLabel(7)).toBe('7 photos');
  });
});

describe('challenge validation (SPEC 5.1)', () => {
  it('requires a title of at most 60 characters', () => {
    expect(validateChallengeTitle('  ').valid).toBe(false);
    expect(validateChallengeTitle('x'.repeat(61)).valid).toBe(false);
    expect(validateChallengeTitle(' ok ')).toEqual({ valid: true, value: 'ok' });
  });

  it('allows an empty description but caps it at 200', () => {
    expect(validateChallengeDescription('')).toEqual({ valid: true, value: null });
    expect(validateChallengeDescription('x'.repeat(201)).valid).toBe(false);
  });
});
