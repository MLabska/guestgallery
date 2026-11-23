/** Formats a Date as YYYY-MM-DD in the device's local time zone (default of the event date, SPEC 1.1). */
export function toIsoDate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses YYYY-MM-DD into a local-time Date at midnight; null when it is not a real calendar date. */
export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Long label such as "Saturday, 12 December 2026"; an unparsable value is returned unchanged. */
export function formatLongDate(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * The local day `iso` as a half-open range of UTC instants: from its local midnight up to (not
 * including) the next local midnight (DESIGN.md §5, 4.4). Null for an invalid date. The next day
 * is built with the calendar, so a 23 or 25 hour day (daylight saving) is handled correctly.
 */
export function dayRange(iso: string): { from: string; to: string } | null {
  const start = parseIsoDate(iso);
  if (!start) return null;
  const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  return { from: start.toISOString(), to: next.toISOString() };
}
