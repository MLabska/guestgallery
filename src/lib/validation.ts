export const EVENT_NAME_MAX = 60;
export const NICKNAME_MAX = 30;
export const CHALLENGE_TITLE_MAX = 60;
export const CHALLENGE_DESCRIPTION_MAX = 200;

export type ValidationResult<T> = { valid: true; value: T } | { valid: false; error: string };

function requiredText(raw: string, max: number, label: string): ValidationResult<string> {
  const value = raw.trim();
  if (value.length === 0) return { valid: false, error: `${label} is required` };
  if (value.length > max) {
    return { valid: false, error: `${label} must be at most ${max} characters` };
  }
  return { valid: true, value };
}

export function validateEventName(raw: string): ValidationResult<string> {
  return requiredText(raw, EVENT_NAME_MAX, 'Event name');
}

export function validateNickname(raw: string): ValidationResult<string> {
  return requiredText(raw, NICKNAME_MAX, 'Nickname');
}

export function validateChallengeTitle(raw: string): ValidationResult<string> {
  return requiredText(raw, CHALLENGE_TITLE_MAX, 'Title');
}

/** Optional: empty input is valid and yields null. */
export function validateChallengeDescription(raw: string): ValidationResult<string | null> {
  const value = raw.trim();
  if (value.length === 0) return { valid: true, value: null };
  if (value.length > CHALLENGE_DESCRIPTION_MAX) {
    return {
      valid: false,
      error: `Description must be at most ${CHALLENGE_DESCRIPTION_MAX} characters`,
    };
  }
  return { valid: true, value };
}

/** Event date is required and must be a valid YYYY-MM-DD date. */
export function validateEventDate(raw: string): ValidationResult<string> {
  const value = raw.trim();
  if (value.length === 0) return { valid: false, error: 'Event date is required' };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { valid: false, error: 'Event date must be in the format YYYY-MM-DD' };
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { valid: false, error: 'Event date is not a valid date' };
  }
  return { valid: true, value };
}
