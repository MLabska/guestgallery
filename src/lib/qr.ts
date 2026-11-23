import * as Linking from 'expo-linking';

import { isValidCode } from './eventCode';

/**
 * Content of the QR code (DESIGN.md §5): a deep link to the route join/{CODE}.
 * In Expo Go this is an Expo link such as
 *   exp://u.expo.dev/update/<id>/--/join/{CODE}   (published update)
 *   exp://192.168.0.10:8081/--/join/{CODE}        (dev server)
 * so the iPhone Camera app can open it in Expo Go. In a real build it is
 * guestgallery://join/{CODE}.
 */
export function buildJoinUrl(
  code: string,
  createURL: (path: string) => string = (path) => Linking.createURL(path),
): string {
  return createURL(`join/${code}`);
}

// guestgallery://join/CODE, or an Expo Go link ending in /--/join/CODE (query allowed).
const JOIN_URL = /^(?:guestgallery:\/\/|exps?:\/\/\S*?\/--\/)join\/([^/?#\s]*)(?:[?#]\S*)?$/;

/** Returns the event code from a scanned string, or null if it is not a GuestGallery QR code. */
export function parseJoinUrl(url: string): string | null {
  const match = JOIN_URL.exec(url.trim());
  if (!match) return null;
  const code = match[1];
  return isValidCode(code) ? code : null;
}
