import {
  validateChallengeDescription,
  validateChallengeTitle,
  validateEventDate,
  validateEventName,
  validateNickname,
} from '../src/lib/validation';

describe('validateEventName', () => {
  it('trims and accepts 1-60 chars', () => {
    expect(validateEventName('  Anna & Tom  ')).toEqual({ valid: true, value: 'Anna & Tom' });
    expect(validateEventName('a'.repeat(60)).valid).toBe(true);
  });
  it('rejects empty, blank and too long', () => {
    expect(validateEventName('').valid).toBe(false);
    expect(validateEventName('   ').valid).toBe(false);
    expect(validateEventName('a'.repeat(61)).valid).toBe(false);
  });
});

describe('validateNickname', () => {
  it('trims and accepts 1-30 chars', () => {
    expect(validateNickname(' Bob ')).toEqual({ valid: true, value: 'Bob' });
    expect(validateNickname('a'.repeat(30)).valid).toBe(true);
  });
  it('rejects empty and too long', () => {
    expect(validateNickname('  ').valid).toBe(false);
    expect(validateNickname('a'.repeat(31)).valid).toBe(false);
  });
});

describe('validateChallengeTitle', () => {
  it('accepts up to 60 chars, rejects empty and longer', () => {
    expect(validateChallengeTitle('Selfie with the bride').valid).toBe(true);
    expect(validateChallengeTitle('a'.repeat(60)).valid).toBe(true);
    expect(validateChallengeTitle('').valid).toBe(false);
    expect(validateChallengeTitle('a'.repeat(61)).valid).toBe(false);
  });
});

describe('validateChallengeDescription', () => {
  it('treats empty as null', () => {
    expect(validateChallengeDescription('  ')).toEqual({ valid: true, value: null });
  });
  it('accepts up to 200 chars, rejects longer', () => {
    expect(validateChallengeDescription('a'.repeat(200)).valid).toBe(true);
    expect(validateChallengeDescription('a'.repeat(201)).valid).toBe(false);
  });
});

describe('validateEventDate', () => {
  it('accepts a valid date', () => {
    expect(validateEventDate('2026-06-20')).toEqual({ valid: true, value: '2026-06-20' });
    expect(validateEventDate('2028-02-29').valid).toBe(true);
  });
  it('rejects empty, malformed and impossible dates', () => {
    expect(validateEventDate('').valid).toBe(false);
    expect(validateEventDate('20.6.2026').valid).toBe(false);
    expect(validateEventDate('2026-02-30').valid).toBe(false);
    expect(validateEventDate('2027-02-29').valid).toBe(false);
  });
});
