import { isValidCode, normalizeCode } from './eventCode';

/** Normalises typed input; returns the code, or null when it cannot be a real event code. */
export function parseTypedCode(input: string): string | null {
  const code = normalizeCode(input);
  return isValidCode(code) ? code : null;
}
