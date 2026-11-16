import { uploadsOpen } from '../src/lib/uploadWindow';

const closeAt = '2026-06-27T23:59:59.999Z';

describe('uploadsOpen', () => {
  it('is open before the close time', () => {
    expect(uploadsOpen(closeAt, new Date('2026-06-20T12:00:00Z'))).toBe(true);
  });
  it('is closed at and after the close time', () => {
    expect(uploadsOpen(closeAt, new Date(closeAt))).toBe(false);
    expect(uploadsOpen(closeAt, new Date('2026-06-28T00:00:00Z'))).toBe(false);
  });
  it('accepts a Date and defaults now', () => {
    expect(uploadsOpen(new Date(Date.now() + 60_000))).toBe(true);
    expect(uploadsOpen(new Date(Date.now() - 60_000))).toBe(false);
  });
  it('is closed for an invalid date', () => {
    expect(uploadsOpen('not a date', new Date())).toBe(false);
  });
});
