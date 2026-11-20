import {
  DELETE_NOT_ALLOWED_MESSAGE,
  canDeletePhoto,
  deleteErrorMessage,
} from '../src/lib/photoDelete';

describe('canDeletePhoto', () => {
  const photo = { uploader_id: 'guest-1' };

  it('allows the uploader to delete their own photo', () => {
    expect(canDeletePhoto(photo, 'guest-1', false)).toBe(true);
  });

  it('hides delete on somebody else\'s photo for a guest', () => {
    expect(canDeletePhoto(photo, 'guest-2', false)).toBe(false);
  });

  it('allows the host to delete any photo', () => {
    expect(canDeletePhoto(photo, 'host-1', true)).toBe(true);
  });

  it('hides delete without a session', () => {
    expect(canDeletePhoto(photo, undefined, false)).toBe(false);
    expect(canDeletePhoto(photo, undefined, true)).toBe(false);
  });
});

describe('deleteErrorMessage', () => {
  it('keeps the not-allowed reason', () => {
    expect(deleteErrorMessage(DELETE_NOT_ALLOWED_MESSAGE)).toBe(DELETE_NOT_ALLOWED_MESSAGE);
  });

  it('adds a connection hint for any other error', () => {
    expect(deleteErrorMessage('Could not delete the photo')).toMatch(/connection/i);
    expect(deleteErrorMessage(undefined)).toMatch(/connection/i);
  });
});
