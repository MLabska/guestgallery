import { CODE_ALPHABET, isValidCode, normalizeCode } from '../src/lib/eventCode';

describe('normalizeCode', () => {
  it('upper-cases and strips spaces', () => {
    expect(normalizeCode(' k7p 4qx ')).toBe('K7P4QX');
  });
  it('strips tabs and newlines', () => {
    expect(normalizeCode('k7\tp4\nqx')).toBe('K7P4QX');
  });
});

describe('isValidCode', () => {
  it('accepts 6 allowed characters', () => {
    expect(isValidCode('K7P4QX')).toBe(true);
  });
  it('rejects wrong length', () => {
    expect(isValidCode('K7P4Q')).toBe(false);
    expect(isValidCode('K7P4QXA')).toBe(false);
  });
  it('rejects confusable characters', () => {
    for (const bad of ['O', '0', 'I', '1']) {
      expect(isValidCode(`K7P4Q${bad}`)).toBe(false);
    }
  });
  it('rejects lower case', () => {
    expect(isValidCode('k7p4qx')).toBe(false);
  });
  it('alphabet has no confusable characters', () => {
    expect(CODE_ALPHABET).not.toMatch(/[O0I1]/);
  });
});
