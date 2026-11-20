import { parseTypedCode } from '../src/lib/joinCode';
import { isEventNotFound, joinEventErrorMessage } from '../src/lib/joinErrors';

describe('joinEventErrorMessage', () => {
  it('maps known RPC errors with the exact SPEC texts', () => {
    expect(joinEventErrorMessage('EVENT_NOT_FOUND')).toBe('Event not found');
    expect(joinEventErrorMessage('NICKNAME_TAKEN')).toBe(
      'This nickname is already taken in this event',
    );
    expect(joinEventErrorMessage('INVALID_NICKNAME')).toMatch(/1 to 30/);
    expect(joinEventErrorMessage('NOT_AUTHENTICATED')).toMatch(/signed in/);
  });

  it('falls back to a generic message', () => {
    expect(joinEventErrorMessage('Network request failed')).toMatch(/Could not join/);
    expect(joinEventErrorMessage(null)).toMatch(/Could not join/);
  });

  it('recognises the not-found message', () => {
    expect(isEventNotFound(joinEventErrorMessage('EVENT_NOT_FOUND'))).toBe(true);
    expect(isEventNotFound(joinEventErrorMessage('NICKNAME_TAKEN'))).toBe(false);
  });
});

describe('parseTypedCode', () => {
  it('is case-insensitive and ignores spaces', () => {
    expect(parseTypedCode(' k7p 4qx ')).toBe('K7P4QX');
  });

  it('rejects input that cannot be a code', () => {
    expect(parseTypedCode('K7P4Q')).toBeNull();
    expect(parseTypedCode('K7P4Q0')).toBeNull();
    expect(parseTypedCode('')).toBeNull();
  });
});
