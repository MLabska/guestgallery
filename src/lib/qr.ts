import { isValidCode } from './eventCode';

const PREFIX = 'guestgallery://join/';

/** Content of the QR code: guestgallery://join/{CODE} (DESIGN.md §5). */
export function buildJoinUrl(code: string): string {
  return `${PREFIX}${code}`;
}

/** Returns the event code from a scanned string, or null if it is not a GuestGallery QR code. */
export function parseJoinUrl(url: string): string | null {
  const text = url.trim();
  if (!text.startsWith(PREFIX)) return null;
  const code = text.slice(PREFIX.length);
  return isValidCode(code) ? code : null;
}
